import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Remove = createWithRemoteLoader({
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
            title: formatMessage({ id: 'adminNpmPackage.remove.confirmTitle' }),
            content: formatMessage({ id: 'adminNpmPackage.remove.confirmContent' }, { name: data.name || data.packageName }),
            onOk: async () => {
              const { data: resData } = await ajax(
                Object.assign({}, apis.npmPackage.delete, {
                  data: { id: data.id }
                })
              );
              if (resData.code !== 0) {
                message.error(formatMessage({ id: 'adminNpmPackage.remove.failed' }));
                return;
              }
              message.success(formatMessage({ id: 'common.deleteSuccess' }));
              onSuccess && onSuccess();
            }
          });
        }}
      />
    );
  })
);

export default Remove;
