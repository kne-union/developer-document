import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import FormInner from '../FormInner';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Save = createWithRemoteLoader({
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
            title: formatMessage({ id: 'appManager.save.modalTitle' }),
            size: 'small',
            formProps: {
              data: Object.assign({}, data),
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.appManager.save, {
                    data: {
                      name: data.name,
                      label: formData.label,
                      domain: formData.domain || null,
                      icon: formData.icon,
                      description: formData.description
                    }
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'common.saveSuccess' }));
                onSuccess && onSuccess();
              }
            },
            children: <FormInner isEdit />
          });
        }}
      />
    );
  })
);

export default Save;
