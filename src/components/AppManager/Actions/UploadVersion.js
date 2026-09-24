import { App, Button } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const UploadVersion = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:FormInfo', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, children, ...props }) => {
    const [useFormModal, FormInfo, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { Input, Upload } = FormInfo.fields;
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    return (
      <Button
        {...props}
        type={props.type || 'primary'}
        onClick={() => {
          formModal({
            title: formatMessage({ id: 'appManager.upload.modalTitle' }),
            size: 'small',
            formProps: {
              onSubmit: async formData => {
                const fileItem = Array.isArray(formData.file) ? formData.file[0] : formData.file;
                const file = fileItem?.file || fileItem?.originFileObj;
                if (!file) {
                  message.error(formatMessage({ id: 'appManager.upload.fileRequired' }));
                  return false;
                }
                const { data: resData } = await ajax.postForm({
                  url: apis.appManager.uploadVersion.url,
                  data: {
                    file,
                    name: data.name,
                    version: formData.version,
                    label: formData.label || ''
                  }
                });
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'appManager.upload.success' }));
                onSuccess && onSuccess();
              }
            },
            children: (
              <>
                <Input name="version" label={formatMessage({ id: 'appManager.upload.version' })} rule="REQ" block />
                <Input name="label" label={formatMessage({ id: 'appManager.upload.label' })} block />
                <Upload
                  name="file"
                  label={formatMessage({ id: 'appManager.upload.file' })}
                  rule="REQ"
                  accept={['.zip']}
                  maxLength={1}
                  multiple={false}
                  fileSize={200}
                  onUpload={async ({ file }) => ({
                    data: {
                      code: 0,
                      data: {
                        id: `local-${Date.now()}`,
                        filename: file.name,
                        file
                      }
                    }
                  })}
                  block
                />
              </>
            )
          });
        }}
      >
        {children}
      </Button>
    );
  })
);

export default UploadVersion;
