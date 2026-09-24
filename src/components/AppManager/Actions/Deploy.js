import { App, Button } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Deploy = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:FormInfo', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, versionId, version, onSuccess, children, ...props }) => {
    const [useFormModal, FormInfo, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { Switch } = FormInfo.fields;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <Button
        {...props}
        onClick={() => {
          if (!versionId && !version) {
            message.error(formatMessage({ id: 'appManager.deploy.versionRequired' }));
            return;
          }
          formModal({
            title: formatMessage({ id: 'appManager.deploy.modalTitle' }),
            size: 'small',
            formProps: {
              data: { runMigration: true },
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.appManager.deploy, {
                    data: {
                      name: data.name,
                      versionId: versionId || undefined,
                      version: version || undefined,
                      runMigration: formData.runMigration !== false
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
            children: <Switch name="runMigration" label={formatMessage({ id: 'appManager.deploy.runMigration' })} />
          });
        }}
      >
        {children}
      </Button>
    );
  })
);

export default Deploy;
