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
            title: formatMessage({ id: 'adminNpmPackage.save.modalTitle' }),
            size: 'small',
            formProps: {
              data: Object.assign({}, data),
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.npmPackage.update, {
                    data: Object.assign({}, formData, { id: data.id })
                  })
                );
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'common.saveSuccess' }));
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

export default Save;
