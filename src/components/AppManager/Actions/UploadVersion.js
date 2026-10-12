import { App, Button } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const PackageUpload = ({ FormInfo, ajax, appName, ...props }) => {
  const { Upload } = FormInfo.fields;
  const formApi = FormInfo.useFormContext();
  const { formatMessage } = useIntl();
  return (
    <Upload
      {...props}
      onUpload={async ({ file }) => {
        const version = formApi.formData?.version;
        if (!version) {
          throw new Error(formatMessage({ id: 'appManager.upload.versionFirst' }));
        }
        return ajax.postForm({
          url: '/api/v1/static/upload',
          params: { path: `应用中心/${appName}` },
          data: { file: new File([file], `${appName}-${version}.zip`, { type: file.type || 'application/zip' }) }
        });
      }}
    />
  );
};

const UploadVersion = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:FormInfo', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, children, ...props }) => {
    const [useFormModal, FormInfo, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { Input } = FormInfo.fields;
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
            okText: formatMessage({ id: 'appManager.upload.submit' }),
            formProps: {
              onSubmit: async formData => {
                const { data: resData } = await ajax(
                  Object.assign({}, apis.appManager.uploadVersion, {
                    data: {
                      fileId: formData.fileId,
                      name: data.name,
                      version: formData.version,
                      label: formData.label || ''
                    }
                  })
                );
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
                <PackageUpload
                  FormInfo={FormInfo}
                  ajax={ajax}
                  appName={data.name}
                  name="fileId"
                  label={formatMessage({ id: 'appManager.upload.file' })}
                  rule="REQ"
                  interceptor={['object-output-value', 'array-single']}
                  accept={['.zip']}
                  maxLength={1}
                  multiple={false}
                  fileSize={200}
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
