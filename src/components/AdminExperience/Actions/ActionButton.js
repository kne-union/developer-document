import { createWithRemoteLoader } from '@kne/remote-loader';
import { App } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const ActionButton = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, api, apiKey, successMessage, ...props }) => {
    const [ConfirmButton, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const resolvedApi = api || (apiKey ? apis.experience?.[apiKey] : null);

    return (
      <ConfirmButton
        {...props}
        onClick={async () => {
          const { data: resData } = await ajax(
            Object.assign({}, resolvedApi, {
              data: { id: data.id }
            })
          );
          if (resData.code !== 0) {
            return;
          }
          message.success(successMessage);
          onSuccess && onSuccess();
        }}
      />
    );
  })
);

export default ActionButton;
