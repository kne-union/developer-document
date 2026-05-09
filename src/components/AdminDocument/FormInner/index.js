import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor', 'components-admin:GroupSelect']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo, Editor, GroupSelect] = remoteModules;
    const { Input, Switch, CheckboxGroup } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <>
        <FormInfo
          list={[
            <Input name="name" label={formatMessage({ id: 'common.name' })} rule="REQ LEN-0-200" block />,
            <Editor name="content" label={formatMessage({ id: 'adminDocument.formInner.contentLabel' })} rows={8} block isMarkdown />,
            <GroupSelect name="groups" type="document" label={formatMessage({ id: 'common.group' })} showAdd />,
            <Switch name="isPublic" label={formatMessage({ id: 'common.isPublic' })} />
          ]}
        />
      </>
    );
  })
);

export default FormInner;
