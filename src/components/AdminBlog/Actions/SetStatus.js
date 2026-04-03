import { createWithRemoteLoader } from '@kne/remote-loader';
import { App } from 'antd';

const SetStatus = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(({ remoteModules, data, status, onSuccess, ...props }) => {
  const [ConfirmButton, usePreset] = remoteModules;
  const { apis, ajax } = usePreset();
  const { message } = App.useApp();

  const apiConfig = status === 'published' ? apis.blog.publish : apis.blog.unpublish;

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
        message.success(status === 'published' ? '发布成功' : '已取消发布');
        onSuccess && onSuccess();
      }}
    />
  );
});

export default SetStatus;
