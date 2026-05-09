import { createWithRemoteLoader } from '@kne/remote-loader';
import { App } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Remove = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
    const [ConfirmButton, usePreset] = remoteModules;
    const { apis, ajax } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <ConfirmButton
        {...props}
        onClick={async () => {
          const { data: resData } = await ajax(
            Object.assign({}, apis.document.delete, {
              data: { id: data.id }
            })
          );

          if (resData.code !== 0) {
            return;
          }
          message.success(formatMessage({ id: 'common.deleteSuccess' }));
          onSuccess && onSuccess();
        }}
      />
    );
  })
);

export default Remove;
