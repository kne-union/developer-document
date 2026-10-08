import { useRef, useState } from 'react';
import { Alert, App, Button, Radio, Space, Typography } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Fetch from '@kne/react-fetch';
import { MigrationStatus } from './MigrationManager';

const { Text } = Typography;

const MigrationPlanList = ({ files, actionsRef, formatMessage }) => {
  const [actions, setActions] = useState(() => {
    const init = {};
    files
      .filter(item => item.executed === false)
      .forEach(item => {
        init[item.name] = 'execute';
      });
    actionsRef.current = init;
    return init;
  });

  const options = ['execute', 'skip', 'hold'].map(value => ({
    value,
    label: formatMessage({ id: `appManager.deploy.action.${value}` })
  }));

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {files.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text ellipsis title={item.name} style={{ flex: 1, minWidth: 0 }}>
            {item.name}
          </Text>
          {item.executed === false ? (
            <Radio.Group
              size="small"
              optionType="button"
              buttonStyle="solid"
              options={options}
              value={actions[item.name]}
              onChange={e => {
                const next = Object.assign({}, actions, { [item.name]: e.target.value });
                actionsRef.current = next;
                setActions(next);
              }}
            />
          ) : (
            <MigrationStatus item={item} formatMessage={formatMessage} />
          )}
        </div>
      ))}
    </Space>
  );
};

const DeployForm = ({ FormInfo, apis, appName, versionId, actionsRef, formatMessage }) => {
  const { Switch } = FormInfo.fields;
  const [runMigration, setRunMigration] = useState(true);

  return (
    <>
      <Switch
        name="runMigration"
        label={formatMessage({ id: 'appManager.deploy.runMigration' })}
        onChange={value => {
          const next = value !== false;
          setRunMigration(next);
          if (!next) {
            actionsRef.current = null;
          }
        }}
      />
      {runMigration && versionId ? (
        <Fetch
          {...Object.assign({}, apis.appManager.migrationList, {
            params: { name: appName, versionId }
          })}
          render={({ data: listData }) => {
            const files = listData?.pageData || [];
            if (!files.length) {
              return (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text strong>{formatMessage({ id: 'appManager.deploy.migrationPlan' })}</Text>
                  <Text type="secondary">{formatMessage({ id: 'appManager.deploy.noScripts' })}</Text>
                </Space>
              );
            }
            return (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text strong>{formatMessage({ id: 'appManager.deploy.migrationPlan' })}</Text>
                {listData.migrateBeforeStart === false ? <Alert type="warning" showIcon message={formatMessage({ id: 'appManager.deploy.migrateDisabled' })} /> : null}
                {listData.dbError ? <Alert type="error" showIcon message={formatMessage({ id: 'appManager.migration.dbError' }, { error: listData.dbError })} /> : null}
                {files.some(item => item.executed === false) ? (
                  <Alert type="info" showIcon message={formatMessage({ id: 'appManager.deploy.planHint' })} />
                ) : (
                  <Text type="secondary">{formatMessage({ id: 'appManager.deploy.noPending' })}</Text>
                )}
                <MigrationPlanList key={`${listData.versionId}-${files.length}`} files={files} actionsRef={actionsRef} formatMessage={formatMessage} />
              </Space>
            );
          }}
        />
      ) : null}
    </>
  );
};

const Deploy = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:FormInfo', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, versionId, version, onSuccess, children, ...props }) => {
    const [useFormModal, FormInfo, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const actionsRef = useRef(null);

    return (
      <Button
        {...props}
        onClick={() => {
          if (!versionId && !version) {
            message.error(formatMessage({ id: 'appManager.deploy.versionRequired' }));
            return;
          }
          actionsRef.current = null;
          formModal({
            title: formatMessage({ id: 'appManager.deploy.modalTitle' }),
            size: 'small',
            formProps: {
              data: { runMigration: true },
              onSubmit: async formData => {
                const runMigration = formData.runMigration !== false;
                const actions = runMigration ? actionsRef.current : null;
                const { data: resData } = await ajax(
                  Object.assign({}, apis.appManager.deploy, {
                    data: {
                      name: data.name,
                      versionId: versionId || undefined,
                      version: version || undefined,
                      runMigration,
                      migrations: actions ? Object.entries(actions).map(([name, action]) => ({ name, action })) : undefined
                    }
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'appManager.deploy.success' }));
                onSuccess && onSuccess(resData.data);
              }
            },
            children: <DeployForm FormInfo={FormInfo} apis={apis} appName={data.name} versionId={versionId} actionsRef={actionsRef} formatMessage={formatMessage} />
          });
        }}
      >
        {children}
      </Button>
    );
  })
);

export default Deploy;
