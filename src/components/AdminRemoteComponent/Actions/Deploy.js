import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Deploy = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();

    if (!data.packageName) {
      return null;
    }

    return (
      <Button
        {...props}
        onClick={() => {
          modal.confirm({
            title: formatMessage({ id: 'adminRemoteComponent.deploy.confirmTitle' }),
            content: formatMessage({ id: 'adminRemoteComponent.deploy.confirmContent' }, { name: data.name || data.remote }),
            onOk: async () => {
              const { data: resData } = await ajax(
                Object.assign({}, apis.remoteComponent.triggerDeploy, {
                  data: { targetId: data.id }
                })
              );
              if (resData.code !== 0) {
                message.error(formatMessage({ id: 'adminRemoteComponent.deploy.taskFailed' }));
                return;
              }
              message.success(formatMessage({ id: 'adminRemoteComponent.deploy.taskCreated' }));
              onSuccess && onSuccess();
            }
          });
        }}
      />
    );
  })
);

export default Deploy;
