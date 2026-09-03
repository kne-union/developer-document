import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import ContentFormInner from './ContentFormInner';

const EditContent = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, ...props }) => {
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
            title: formatMessage({ id: 'adminBlog.leads.editContentTitle' }),
            size: 'small',
            formProps: {
              data: {
                title: data.title,
                content: data.content || data.summary || ''
              },
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.blogLead.complete, {
                    data: {
                      id: data.id,
                      title: formData.title,
                      content: formData.content
                    }
                  })
                );
                if (resData.code !== 0) {
                  message.error(resData.message || formatMessage({ id: 'adminBlog.leads.completeFailed' }));
                  return false;
                }
                message.success(formatMessage({ id: 'adminBlog.leads.completeSuccess' }));
                onSuccess && onSuccess();
              }
            },
            children: <ContentFormInner />
          });
        }}
      />
    );
  })
);

export default EditContent;
