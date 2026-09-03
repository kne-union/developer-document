import { useCallback, useMemo, useState } from 'react';
import { App, Button, Space, Tag, Typography } from 'antd';
import { EditOutlined, SyncOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import SettingsFormInner from './SettingsFormInner';

const { Text } = Typography;

const SettingsView = createWithRemoteLoader({
  modules: ['components-core:InfoPage', 'components-core:Descriptions']
})(
  withLocale(({ remoteModules, data, onEdit, onFetch, fetching }) => {
    const [InfoPage, Descriptions] = remoteModules;
    const { formatMessage } = useIntl();

    const scheduleText = data.scheduleType === 'intervalHours' ? formatMessage({ id: 'adminBlog.leads.scheduleInterval' }, { hours: data.intervalHours }) : formatMessage({ id: 'adminBlog.leads.scheduleDaily' }, { hour: data.scheduleHour });

    return (
      <InfoPage>
        <InfoPage.Part
          title={formatMessage({ id: 'adminBlog.leads.settingsTitle' })}
          extra={
            <Space>
              <Button icon={<SyncOutlined spin={fetching} />} loading={fetching} onClick={onFetch}>
                {formatMessage({ id: 'adminBlog.leads.fetchNow' })}
              </Button>
              <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                {formatMessage({ id: 'common.edit' })}
              </Button>
            </Space>
          }
        >
          <Descriptions
            dataSource={[
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.channel' }),
                  content: formatMessage({ id: 'adminBlog.leads.channelZhihu' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.enabled' }),
                  content: data.enabled ? <Tag color="success">{formatMessage({ id: 'adminBlog.leads.enabledOn' })}</Tag> : <Tag>{formatMessage({ id: 'adminBlog.leads.enabledOff' })}</Tag>
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.accessSecret' }),
                  content: data.accessSecretMasked ? data.accessSecretMasked : data.usingEnvSecret ? formatMessage({ id: 'adminBlog.leads.usingEnvSecret' }) : formatMessage({ id: 'adminBlog.leads.secretEmpty' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.keywords' }),
                  content: (data.keywords || []).length ? (
                    <Space wrap>
                      {(data.keywords || []).map(item => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '-'
                  )
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.countPerKeyword' }),
                  content: data.countPerKeyword
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.schedule' }),
                  content: scheduleText
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.maxRequestsPerRun' }),
                  content: data.maxRequestsPerRun
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.includeHot' }),
                  content: data.includeHot ? formatMessage({ id: 'common.yes' }) : formatMessage({ id: 'common.no' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.defaultBlogStatus' }),
                  content: data.defaultBlogStatus === 'published' ? formatMessage({ id: 'common.published' }) : formatMessage({ id: 'common.draft' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'common.isPublic' }),
                  content: data.defaultIsPublic !== false ? formatMessage({ id: 'common.public' }) : formatMessage({ id: 'common.private' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.defaultGroups' }),
                  content: (data.defaultGroups || []).length ? (
                    <Space wrap>
                      {(data.defaultGroups || []).map(group => (
                        <Tag key={group.code || group.name}>{group.name || group.code}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '-'
                  )
                }
              ],
              [
                {
                  label: formatMessage({ id: 'adminBlog.leads.lastRunAt' }),
                  content: data.lastRunAt || '-'
                }
              ]
            ]}
          />
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            {formatMessage({ id: 'adminBlog.leads.settingsHint' })}
          </Text>
        </InfoPage.Part>
      </InfoPage>
    );
  })
);

const Settings = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:FormInfo@useFormModal']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset, useFormModal] = remoteModules;
    const { ajax, apis } = usePreset();
    const formModal = useFormModal();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const [fetching, setFetching] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey(key => key + 1), []);

    const handleFetch = useCallback(async () => {
      setFetching(true);
      try {
        const { data: resData } = await ajax(apis.blogLead.fetch);
        if (resData.code === 0) {
          message.success(resData.data?.message || formatMessage({ id: 'adminBlog.leads.fetchTaskCreated' }));
        } else {
          message.error(resData.message || formatMessage({ id: 'adminBlog.leads.fetchFailed' }));
        }
      } catch (error) {
        message.error(formatMessage({ id: 'adminBlog.leads.fetchFailed' }));
      } finally {
        setFetching(false);
      }
    }, [ajax, apis.blogLead.fetch, formatMessage, message]);

    const handleEdit = useCallback(
      data => {
        formModal({
          title: formatMessage({ id: 'adminBlog.leads.editSettingsTitle' }),
          size: 'small',
          formProps: {
            data: {
              ...data,
              accessSecret: '',
              keywordsText: (data.keywords || []).join('\n')
            },
            onSubmit: async formData => {
              const keywords = String(formData.keywordsText || '')
                .split(/[\n,]/)
                .map(item => item.trim())
                .filter(Boolean);
              const payload = {
                enabled: formData.enabled,
                keywords,
                countPerKeyword: formData.countPerKeyword,
                scheduleType: formData.scheduleType,
                scheduleHour: formData.scheduleHour,
                intervalHours: formData.intervalHours,
                maxRequestsPerRun: formData.maxRequestsPerRun,
                includeHot: formData.includeHot,
                hotLimit: formData.hotLimit,
                defaultBlogStatus: formData.defaultBlogStatus,
                defaultIsPublic: formData.defaultIsPublic,
                defaultGroups: formData.defaultGroups || []
              };
              if (formData.accessSecret) {
                payload.accessSecret = formData.accessSecret;
              }
              const { data: resData } = await ajax(
                Object.assign({}, apis.blogLead.saveSettings, {
                  data: payload
                })
              );
              if (resData.code !== 0) {
                return false;
              }
              message.success(formatMessage({ id: 'common.saveSuccess' }));
              reload();
            }
          },
          children: <SettingsFormInner />
        });
      },
      [ajax, apis.blogLead.saveSettings, formModal, formatMessage, message, reload]
    );

    const fetchApi = useMemo(() => Object.assign({}, apis.blogLead.settings), [apis.blogLead.settings]);

    return <Fetch key={reloadKey} {...fetchApi} render={({ data }) => <SettingsView data={data} onEdit={() => handleEdit(data)} onFetch={handleFetch} fetching={fetching} />} />;
  })
);

export default Settings;
