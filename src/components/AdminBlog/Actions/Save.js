import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';

const Save = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(({ remoteModules, data, onSuccess, ...props }) => {
  const [useFormModal, usePreset] = remoteModules;
  const formModal = useFormModal();
  const { ajax, apis } = usePreset();
  const { message } = App.useApp();

  return (
    <Button
      {...props}
      onClick={() => {
        formModal({
          title: '编辑博客',
          size: 'small',
          formProps: {
            data: Object.assign({}, data),
            onSubmit: async formData => {
              const { data: resData } = await ajax(
                Object.assign({}, apis.blog.update, {
                  data: Object.assign({}, formData, { id: data.id })
                })
              );
              if (resData.code !== 0) {
                return false;
              }
              message.success('保存成功');
              onSuccess && onSuccess();
            }
          },
          children: <FormInner />
        });
      }}
    />
  );
});

export default Save;
