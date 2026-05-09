import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo] = remoteModules;
    const { Input, TextArea, Switch, Select } = FormInfo.fields;
    const { formatMessage } = useIntl();

    const TYPE_OPTIONS = [
      { label: formatMessage({ id: 'shared.catalogMeta.frontend' }), value: 'frontend' },
      { label: formatMessage({ id: 'shared.catalogMeta.nodejs' }), value: 'nodejs' },
      { label: formatMessage({ id: 'shared.catalogMeta.engineering' }), value: 'engineering' },
      { label: formatMessage({ id: 'shared.catalogMeta.miniprogram' }), value: 'miniprogram' },
      { label: formatMessage({ id: 'shared.catalogMeta.prompts' }), value: 'prompts' },
      { label: formatMessage({ id: 'shared.catalogMeta.other' }), value: 'other' }
    ];

    return (
      <>
        <Input name="packageName" label="Package Name" rule="REQ LEN-0-200" placeholder="e.g.: @kne/button" block />
        <Input name="name" label={formatMessage({ id: 'adminNpmPackage.formInner.displayNameLabel' })} rule="LEN-0-100" placeholder={formatMessage({ id: 'adminNpmPackage.formInner.displayNamePlaceholder' })} block />
        <Select name="type" label={formatMessage({ id: 'adminNpmPackage.formInner.componentType' })} options={TYPE_OPTIONS} defaultValue="other" />
        <Input name="registry" label="Registry" rule="LEN-0-500" placeholder={formatMessage({ id: 'adminNpmPackage.formInner.registryPlaceholder' })} block />
        <TextArea name="description" label={formatMessage({ id: 'common.description' })} rule="LEN-0-1000" placeholder={formatMessage({ id: 'adminNpmPackage.formInner.descriptionPlaceholder' })} block />
        <Switch name="isPublic" label={formatMessage({ id: 'common.isPublic' })} />
      </>
    );
  })
);

export default FormInner;
