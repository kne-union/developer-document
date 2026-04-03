import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';

const Sync = createWithRemoteLoader({
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
          title: '确认同步',
          content: `确定要从 registry 同步 "${data.name || data.packageName}" 的信息吗？`,
          onOk: async () => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.npmPackage.triggerSync, {
                data: { targetId: data.id }
              })
            );
            if (resData.code !== 0) {
              message.error('同步任务创建失败');
              return;
            }
            message.success('同步任务已创建，请稍后刷新查看结果');
            onSuccess && onSuccess();
          }
        });
      }}
    />
  );
});

export default Sync;
