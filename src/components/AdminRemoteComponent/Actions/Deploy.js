import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';

const Deploy = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules, data, onSuccess, ...props }) => {
  const [usePreset] = remoteModules;
  const { ajax, apis } = usePreset();
  const { message, modal } = App.useApp();

  // 没有 packageName 时不显示部署按钮
  if (!data.packageName) {
    return null;
  }

  return (
    <Button
      {...props}
      onClick={() => {
        modal.confirm({
          title: '确认部署',
          content: `确定要部署 "${data.name || data.remote}" 的示例吗？`,
          onOk: async () => {
            const { data: resData } = await ajax(
              Object.assign({}, apis.remoteComponent.triggerDeploy, {
                data: { targetId: data.id }
              })
            );
            if (resData.code !== 0) {
              message.error('部署任务创建失败');
              return;
            }
            message.success('部署任务已创建，请稍后刷新查看结果');
            onSuccess && onSuccess();
          }
        });
      }}
    />
  );
});

export default Deploy;
