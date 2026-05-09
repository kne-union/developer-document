import { createWithRemoteLoader } from '@kne/remote-loader';
import { App } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const SetStatus = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, status, onSuccess, ...props }) => {
    const [ConfirmButton, usePreset] = remoteModules;
    const { apis, ajax } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    const apiConfig = status === 'published' ? apis.document.publish : apis.document.unpublish;

    return (
      <ConfirmButton
        {...props}
        onClick={async () => {
          const { data: resData } = await ajax(
            Object.assign({}, apiConfig, {
              data: { id: data.id }
            })
          );
          if (resData.code !== 0) {
            return;
          }
          message.success(status === 'published' ? formatMessage({ id: 'adminDocument.setStatus.publishSuccess' }) : formatMessage({ id: 'adminDocument.setStatus.unpublishSuccess' }));
          onSuccess && onSuccess();
        }}
      />
    );
  })
);

export default SetStatus;
