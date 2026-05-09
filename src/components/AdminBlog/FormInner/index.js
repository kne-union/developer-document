import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const FormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor', 'components-admin:GroupSelect']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo, Editor, GroupSelect] = remoteModules;
    const { Input, Switch, DatePicker } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <>
        <FormInfo
          list={[
            <Input name="title" label={formatMessage({ id: 'common.title' })} rule="REQ LEN-0-200" block />,
            <Editor name="content" label={formatMessage({ id: 'adminBlog.formInner.contentLabel' })} rule="REQ" rows={8} block />,
            <DatePicker name="publishTime" label={formatMessage({ id: 'common.publishTime' })} placeholder={formatMessage({ id: 'adminBlog.formInner.publishTimePlaceholder' })} showTime />,
            <GroupSelect name="groups" type="blog" label={formatMessage({ id: 'common.group' })} showAdd />,
            <Switch name="isPublic" label={formatMessage({ id: 'common.isPublic' })} />
          ]}
        />
      </>
    );
  })
);

export default FormInner;
