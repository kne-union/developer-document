import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Create = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, onSuccess, ...props }) => {
    const [useFormModal, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <Button
        {...props}
        onClick={() => {
          formModal({
            title: formatMessage({ id: 'adminBlog.create.modalTitle' }),
            size: 'small',
            formProps: {
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.blog.create, {
                    data: Object.assign({}, formData)
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'common.addSuccess' }));
                onSuccess && onSuccess();
              }
            },
            children: <FormInner />
          });
        }}
      />
    );
  })
);

export default Create;
