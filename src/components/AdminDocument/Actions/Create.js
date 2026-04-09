import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';

const Create = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(({ remoteModules, onSuccess, ...props }) => {
  const [useFormModal, usePreset] = remoteModules;
  const formModal = useFormModal();
  const { ajax, apis } = usePreset();
  const { message } = App.useApp();

  return (
    <Button
      {...props}
      onClick={() => {
        formModal({
          title: '添加文档',
          formProps: {
            onSubmit: async formData => {
              const { data: resData } = await ajax(
                Object.assign({}, apis.document.create, {
                  data: Object.assign({}, formData)
                })
              );
              if (resData.code !== 0) {
                return false;
              }
              message.success('添加成功');
              onSuccess && onSuccess();
            }
          },
          children: <FormInner />
        });
      }}
    />
  );
});

export default Create;
