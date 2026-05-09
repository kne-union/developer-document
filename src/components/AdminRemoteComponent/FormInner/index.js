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

    const GROUP_OPTIONS = [
      { label: formatMessage({ id: 'shared.catalogMeta.business' }), value: 'business' },
      { label: formatMessage({ id: 'shared.catalogMeta.common' }), value: 'common' }
    ];

    return (
      <>
        <FormInfo
          list={[
            <Input name="remote" label={formatMessage({ id: 'adminRemoteComponent.formInner.componentName' })} rule="REQ LEN-0-100" placeholder="e.g.: @kne/button" block />,
            <Input name="name" label={formatMessage({ id: 'adminRemoteComponent.formInner.displayNameLabel' })} rule="LEN-0-100" placeholder={formatMessage({ id: 'adminRemoteComponent.formInner.displayNamePlaceholder' })} block />,
            <Select name="group" label={formatMessage({ id: 'adminRemoteComponent.formInner.componentCategory' })} options={GROUP_OPTIONS} defaultValue="common" />,
            <Input name="packageName" label={formatMessage({ id: 'adminRemoteComponent.formInner.npmPackageNameLabel' })} rule="LEN-0-200" placeholder="npm package name" block />,
            <Input name="registry" label="NPM Registry" rule="LEN-0-200" placeholder={formatMessage({ id: 'adminRemoteComponent.formInner.npmRegistryPlaceholder' })} block />,
            <Input name="url" label={formatMessage({ id: 'adminRemoteComponent.formInner.entryUrl' })} rule="LEN-0-500" placeholder={formatMessage({ id: 'adminRemoteComponent.formInner.entryUrlPlaceholder' })} block />,
            <TextArea name="description" label={formatMessage({ id: 'adminRemoteComponent.formInner.componentDescription' })} rule="LEN-0-500" rows={3} block />,
            <Input name="tpl" label={formatMessage({ id: 'adminRemoteComponent.formInner.loadTemplate' })} placeholder="{{url}}/components/@kne-components/{{remote}}/{{version}}/build" block />,
            <Input name="defaultVersion" label={formatMessage({ id: 'adminRemoteComponent.formInner.defaultVersionLabel' })} placeholder={formatMessage({ id: 'adminRemoteComponent.formInner.defaultVersionPlaceholder' })} />,
            <Switch name="isPublic" label={formatMessage({ id: 'common.isPublic' })} />
          ]}
        />
      </>
    );
  })
);

export default FormInner;
