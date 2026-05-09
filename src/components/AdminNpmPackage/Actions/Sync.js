import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Sync = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <Button
        {...props}
        onClick={() => {
          modal.confirm({
            title: formatMessage({ id: 'adminNpmPackage.sync.confirmTitle' }),
            content: formatMessage({ id: 'adminNpmPackage.sync.confirmContent' }, { name: data.name || data.packageName }),
            onOk: async () => {
              const { data: resData } = await ajax(
                Object.assign({}, apis.npmPackage.triggerSync, {
                  data: { targetId: data.id }
                })
              );
              if (resData.code !== 0) {
                message.error(formatMessage({ id: 'adminNpmPackage.sync.taskFailed' }));
                return;
              }
              message.success(formatMessage({ id: 'adminNpmPackage.sync.taskCreated' }));
              onSuccess && onSuccess();
            }
          });
        }}
      />
    );
  })
);

export default Sync;
