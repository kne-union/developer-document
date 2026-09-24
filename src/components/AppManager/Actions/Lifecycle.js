import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const makeLifecycleButton = (actionKey, messageId) =>
  createWithRemoteLoader({
    modules: ['components-core:Global@usePreset']
  })(
    withLocale(({ remoteModules, data, onSuccess, ...props }) => {
      const [usePreset] = remoteModules;
      const { ajax, apis } = usePreset();
      const { message } = App.useApp();
      const { formatMessage } = useIntl();

      return (
        <Button
          {...props}
          onClick={async () => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.appManager[actionKey], {
                data: { name: data.name }
              })
            );
            if (resData.code !== 0) {
              return;
            }
            message.success(formatMessage({ id: messageId }));
            onSuccess && onSuccess();
          }}
        />
      );
    })
  );

export const Start = makeLifecycleButton('start', 'appManager.actions.startSuccess');
export const Stop = makeLifecycleButton('stop', 'appManager.actions.stopSuccess');
export const Restart = makeLifecycleButton('restart', 'appManager.actions.restartSuccess');
