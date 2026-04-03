import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';

const Remove = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules, data, onSuccess, ...props }) => {
  const [usePreset] = remoteModules;
  const { ajax, apis } = usePreset();
  const { message, modal } = App.useApp();

  return (
    <Button
      {...props}
      onClick={() => {
        modal.confirm({
          title: '确认删除',
          content: `确定要删除组件 "${data.name || data.packageName}" 吗？`,
          onOk: async () => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.npmPackage.delete, {
                data: { id: data.id }
              })
            );
            if (resData.code !== 0) {
              message.error('删除失败');
              return;
            }
            message.success('删除成功');
            onSuccess && onSuccess();
          }
        });
      }}
    />
  );
});

export default Remove;
