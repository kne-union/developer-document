import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const ContentFormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:Editor']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo, Editor] = remoteModules;
    const { Input } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <FormInfo list={[<Input name="title" label={formatMessage({ id: 'common.title' })} rule="REQ LEN-0-200" block />, <Editor name="content" label={formatMessage({ id: 'adminBlog.leads.contentLabel' })} rule="REQ" rows={10} block />]} />
    );
  })
);

export default ContentFormInner;
