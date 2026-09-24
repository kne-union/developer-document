import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(
  withLocale(({ remoteModules, isEdit }) => {
    const [FormInfo] = remoteModules;
    const { Input, TextArea, Avatar } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <>
        <Avatar name="icon" label={formatMessage({ id: 'common.icon' })} block shape="square" interceptor="photo-string" />
        <Input name="name" label={formatMessage({ id: 'appManager.form.name' })} rule="REQ LEN-1-64" placeholder={formatMessage({ id: 'appManager.form.namePlaceholder' })} disabled={!!isEdit} block />
        <Input name="label" label={formatMessage({ id: 'appManager.form.label' })} rule="REQ LEN-1-100" block />
        <Input name="domain" label={formatMessage({ id: 'appManager.form.domain' })} rule="LEN-0-200" placeholder={formatMessage({ id: 'appManager.form.domainPlaceholder' })} block />
        <TextArea name="description" label={formatMessage({ id: 'common.description' })} rule="LEN-0-1000" block />
      </>
    );
  })
);

export default FormInner;
