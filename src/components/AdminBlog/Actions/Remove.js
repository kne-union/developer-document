import { createWithRemoteLoader } from '@kne/remote-loader';
import { App } from 'antd';

const Remove = createWithRemoteLoader({
  modules: ['components-core:ConfirmButton', 'components-core:Global@usePreset']
})(({ remoteModules, data, onSuccess, ...props }) => {
  const [ConfirmButton, usePreset] = remoteModules;
  const { apis, ajax } = usePreset();
  const { message } = App.useApp();

  return (
    <ConfirmButton
      {...props}
      onClick={async () => {
        const { data: resData } = await ajax(
          Object.assign({}, apis.blog.delete, {
            data: { id: data.id }
          })
        );

        if (resData.code !== 0) {
          return;
        }
        message.success('删除成功');
        onSuccess && onSuccess();
      }}
    />
  );
});

export default Remove;
