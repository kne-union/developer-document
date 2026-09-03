import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const SettingsFormInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-admin:GroupSelect']
})(
  withLocale(({ remoteModules }) => {
    const [FormInfo, GroupSelect] = remoteModules;
    const { Input, Switch, InputNumber, TextArea, Select } = FormInfo.fields;
    const { formatMessage } = useIntl();

    return (
      <FormInfo
        list={[
          <Switch name="enabled" label={formatMessage({ id: 'adminBlog.leads.enabled' })} />,
          <Input name="accessSecret" label={formatMessage({ id: 'adminBlog.leads.accessSecret' })} placeholder={formatMessage({ id: 'adminBlog.leads.accessSecretPlaceholder' })} block />,
          <TextArea name="keywordsText" label={formatMessage({ id: 'adminBlog.leads.keywords' })} placeholder={formatMessage({ id: 'adminBlog.leads.keywordsPlaceholder' })} rule="REQ" rows={5} block />,
          <InputNumber name="countPerKeyword" label={formatMessage({ id: 'adminBlog.leads.countPerKeyword' })} min={1} max={10} rule="REQ" />,
          <Select
            name="scheduleType"
            label={formatMessage({ id: 'adminBlog.leads.scheduleType' })}
            rule="REQ"
            options={[
              { label: formatMessage({ id: 'adminBlog.leads.scheduleTypeDaily' }), value: 'daily' },
              { label: formatMessage({ id: 'adminBlog.leads.scheduleTypeInterval' }), value: 'intervalHours' }
            ]}
          />,
          <InputNumber name="scheduleHour" label={formatMessage({ id: 'adminBlog.leads.scheduleHour' })} min={0} max={23} />,
          <InputNumber name="intervalHours" label={formatMessage({ id: 'adminBlog.leads.intervalHours' })} min={1} max={168} />,
          <InputNumber name="maxRequestsPerRun" label={formatMessage({ id: 'adminBlog.leads.maxRequestsPerRun' })} min={1} max={100} rule="REQ" />,
          <Switch name="includeHot" label={formatMessage({ id: 'adminBlog.leads.includeHot' })} />,
          <InputNumber name="hotLimit" label={formatMessage({ id: 'adminBlog.leads.hotLimit' })} min={1} max={30} />,
          <Select
            name="defaultBlogStatus"
            label={formatMessage({ id: 'adminBlog.leads.defaultBlogStatus' })}
            rule="REQ"
            options={[
              { label: formatMessage({ id: 'common.draft' }), value: 'draft' },
              { label: formatMessage({ id: 'common.published' }), value: 'published' }
            ]}
          />,
          <Switch name="defaultIsPublic" label={formatMessage({ id: 'common.isPublic' })} />,
          <GroupSelect name="defaultGroups" type="blog" label={formatMessage({ id: 'adminBlog.leads.defaultGroups' })} showAdd />
        ]}
      />
    );
  })
);

export default SettingsFormInner;
