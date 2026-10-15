import { useRef, useState } from 'react';
import { Alert, App, Button, Radio, Space, Typography } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { MigrationStatus } from './MigrationManager';
import DeployProgress from './DeployProgress';

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

const DeployForm = ({ FormInfo, listData, actionsRef, formatMessage }) => {
  const { Switch } = FormInfo.fields;
  const [runMigration, setRunMigration] = useState(true);
  const files = listData.pageData || [];

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
      {runMigration ? (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text strong>{formatMessage({ id: 'appManager.deploy.migrationPlan' })}</Text>
          {listData.migrateBeforeStart === false ? <Alert type="warning" showIcon message={formatMessage({ id: 'appManager.deploy.migrateDisabled' })} /> : null}
          {listData.dbError ? <Alert type="error" showIcon message={formatMessage({ id: 'appManager.migration.dbError' }, { error: listData.dbError })} /> : null}
          <Alert type="info" showIcon message={formatMessage({ id: 'appManager.deploy.planHint' })} />
          <MigrationPlanList key={`${listData.versionId}-${files.length}`} files={files} actionsRef={actionsRef} formatMessage={formatMessage} />
        </Space>
      ) : null}
    </>
  );
};

const Deploy = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:FormInfo', 'components-core:Global@usePreset', 'components-core:Modal@useModal', 'components-core:Modal@useConfirmModal']
})(
  withLocale(({ remoteModules, data, versionId, version, onSuccess, children, ...props }) => {
    const [useFormModal, FormInfo, usePreset, useModal, useConfirmModal] = remoteModules;
    const formModal = useFormModal();
    const modal = useModal();
    const confirmModal = useConfirmModal();
    const { ajax, apis, staticUrl } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const actionsRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const openProgress = ({ runMigration, migrations }) =>
      modal({
        title: formatMessage({ id: 'appManager.deploy.progressTitle' }),
        size: 'small',
        footer: null,
        children: (
          <DeployProgress
            ajax={ajax}
            apis={apis}
            staticUrl={staticUrl}
            payload={{ name: data.name, versionId: versionId || undefined, version: version || undefined, runMigration, migrations }}
            formatMessage={formatMessage}
            onDeployed={result => onSuccess && onSuccess(result)}
            onFinish={() => onSuccess && onSuccess()}
          />
        )
      });

    const openRunningProgress = deployment =>
      modal({
        title: formatMessage({ id: 'appManager.deploy.runningTitle' }, { version: deployment.version || '' }),
        size: 'small',
        footer: null,
        children: <DeployProgress ajax={ajax} apis={apis} staticUrl={staticUrl} name={data.name} progressId={deployment.progressId} formatMessage={formatMessage} onFinish={() => onSuccess && onSuccess()} />
      });

    // 列表数据可能已过期（如经 MCP 发起的部署），以最新详情为准
    const loadDeployment = async () => {
      try {
        const { data: resData } = await ajax(Object.assign({}, apis.appManager.detail, { params: { name: data.name } }));
        return resData.code === 0 ? resData.data?.deployment || null : data.deployment || null;
      } catch (e) {
        return data.deployment || null;
      }
    };

    const loadMigrations = async () => {
      if (!versionId) {
        return null;
      }
      const { data: resData } = await ajax(Object.assign({}, apis.appManager.migrationList, { params: { name: data.name, versionId } }));
      return resData.code === 0 ? resData.data : null;
    };

    const handleClick = async () => {
      if (!versionId && !version) {
        message.error(formatMessage({ id: 'appManager.deploy.versionRequired' }));
        return;
      }
      setLoading(true);
      let listData = null;
      try {
        const deployment = await loadDeployment();
        if (deployment?.progressId) {
          openRunningProgress(deployment);
          return;
        }
        listData = await loadMigrations();
      } finally {
        setLoading(false);
      }

      if (!listData || !(listData.pageData || []).some(item => item.executed === false)) {
        confirmModal({
          type: 'confirm',
          title: formatMessage({ id: 'appManager.deploy.confirmTitle' }, { version: version || '' }),
          message: formatMessage({ id: 'appManager.deploy.confirm' }),
          confirmText: formatMessage({ id: 'appManager.deploy.submit' }),
          onConfirm: () => openProgress({ runMigration: true })
        });
        return;
      }

      actionsRef.current = null;
      formModal({
        title: formatMessage({ id: 'appManager.deploy.modalTitle' }),
        size: 'small',
        okText: formatMessage({ id: 'appManager.deploy.submit' }),
        formProps: {
          data: { runMigration: true },
          onSubmit: formData => {
            const runMigration = formData.runMigration !== false;
            const actions = runMigration ? actionsRef.current : null;
            openProgress({
              runMigration,
              migrations: actions ? Object.entries(actions).map(([name, action]) => ({ name, action })) : undefined
            });
          }
        },
        children: <DeployForm FormInfo={FormInfo} listData={listData} actionsRef={actionsRef} formatMessage={formatMessage} />
      });
    };

    return (
      <Button {...props} loading={loading} onClick={handleClick}>
        {children}
      </Button>
    );
  })
);

export default Deploy;
