import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:GroupSelect@GroupFolderField']
})(
  withLocale(({ remoteModules, isEdit }) => {
    const [FormInfo, GroupFolderField] = remoteModules;
    const { TableList } = FormInfo;
    const { Input, TextArea, Avatar, Switch } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <>
        <Avatar name="icon" label={formatMessage({ id: 'common.icon' })} block shape="square" interceptor="photo-string" />
        <Input name="name" label={formatMessage({ id: 'appManager.form.name' })} rule="REQ LEN-1-64" placeholder={formatMessage({ id: 'appManager.form.namePlaceholder' })} disabled={!!isEdit} block />
        <Input name="label" label={formatMessage({ id: 'appManager.form.label' })} rule="REQ LEN-1-100" block />
        <Input name="domain" label={formatMessage({ id: 'appManager.form.domain' })} rule="LEN-0-200" placeholder={formatMessage({ id: 'appManager.form.domainPlaceholder' })} block />
        <GroupFolderField name="category" type="app" showColor label={formatMessage({ id: 'appManager.form.category' })} groupName={formatMessage({ id: 'appManager.form.category' })} block />
        <Switch name="isPublic" label={formatMessage({ id: 'common.isPublic' })} defaultValue={true} />
        <TextArea name="description" label={formatMessage({ id: 'common.description' })} rule="LEN-0-1000" block />
        <TableList
          title={formatMessage({ id: 'appManager.form.entries' })}
          name="entries"
          defaultLength={0}
          addText={formatMessage({ id: 'appManager.form.addEntry' })}
          list={[
            <Input name="label" label={formatMessage({ id: 'appManager.form.entryLabel' })} rule="REQ LEN-1-50" placeholder={formatMessage({ id: 'appManager.form.entryLabelPlaceholder' })} />,
            <Input name="path" label={formatMessage({ id: 'appManager.form.entryPath' })} rule="REQ LEN-1-200" placeholder="/mobile" />
          ]}
        />
      </>
    );
  })
);

export default FormInner;
