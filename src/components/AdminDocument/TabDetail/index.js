import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import Actions from '../Actions';
import { Tag, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from '../style.module.scss';
import { ShareButton, DocumentDetailView } from '@components/Shared';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Basic = createWithRemoteLoader({
  modules: ['components-core:InfoPage', 'components-core:Descriptions']
})(
  withLocale(({ remoteModules, data }) => {
    const [InfoPage, Descriptions] = remoteModules;
    const { formatMessage } = useIntl();

    return (
      <InfoPage>
        <InfoPage.Part title={formatMessage({ id: 'adminDocument.tabDetail.basicInfoTitle' })}>
          <Descriptions
            dataSource={[
              [{ label: 'ID', content: data.id }],
              [{ label: formatMessage({ id: 'common.name' }), content: data.name }],
              [
                {
                  label: formatMessage({ id: 'common.status' }),
                  content: data.status === 'published' ? formatMessage({ id: 'common.published' }) : formatMessage({ id: 'common.draft' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'common.isPublic' }),
                  content: data.isPublic ? formatMessage({ id: 'common.public' }) : formatMessage({ id: 'common.private' })
                }
              ],
              [
                {
                  label: formatMessage({ id: 'common.group' }),
                  content: (
                    <Space>
                      {(data.groups || []).map(group => (
                        <Tag key={group.id}>{group.name}</Tag>
                      ))}
                    </Space>
                  )
                }
              ],
              [
                {
                  label: formatMessage({ id: 'common.creator' }),
                  content: data.createdUser?.email || '-'
                }
              ],
              [
                {
                  label: formatMessage({ id: 'common.createdAt' }),
                  content: data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'
                }
              ]
            ]}
          />
        </InfoPage.Part>
      </InfoPage>
    );
  })
);

const Preview = withLocale(({ data }) => {
  const { formatMessage } = useIntl();
  return (
    <DocumentDetailView
      data={data}
      headerExtra={
        <ShareButton
          type="document"
          id={data.id}
          disabled={data.status !== 'published' || !data.isPublic}
          disabledReason={!data.isPublic ? formatMessage({ id: 'adminDocument.tabDetail.privateCannotShare' }) : formatMessage({ id: 'adminDocument.tabDetail.unpublishedCannotShare' })}
        />
      }
    />
  );
});

const contentMap = {
  basic: Basic,
  preview: Preview
};

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Layout@PageHeader', 'components-core:StateBar', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [Page, PageHeader, StateBar, usePreset] = remoteModules;
    const { apis } = usePreset();
    const [searchParams, setSearchParams] = useSearchParams();
    const { formatMessage } = useIntl();

    return (
      <Fetch
        {...Object.assign({}, apis.document.detail, { params: { id: searchParams.get('id') } })}
        render={({ data, reload }) => {
          const activeKey = searchParams.get('tab') || 'basic';
          const ContentComponent = contentMap[activeKey] || Basic;
          const statusTag =
            data.status === 'published' ? (
              <Tag className={styles.statusTagPublished} icon={<CheckCircleOutlined />}>
                {formatMessage({ id: 'common.published' })}
              </Tag>
            ) : (
              <Tag className={styles.statusTagDraft} icon={<ClockCircleOutlined />}>
                {formatMessage({ id: 'common.draft' })}
              </Tag>
            );
          const visibilityTag = data.isPublic ? (
            <Tag className={styles.visibilityTagPublic} icon={<EyeOutlined />}>
              {formatMessage({ id: 'common.public' })}
            </Tag>
          ) : (
            <Tag className={styles.visibilityTagPrivate} icon={<EyeInvisibleOutlined />}>
              {formatMessage({ id: 'common.private' })}
            </Tag>
          );

          return (
            <Page
              {...props}
              headerFixed={false}
              header={
                <PageHeader
                  title={data.name}
                  info={`ID: ${data.id}`}
                  tags={[
                    <Tag className={styles.domainTag} icon={<FileTextOutlined />} key="domain">
                      {formatMessage({ id: 'adminDocument.tabDetail.domainTag' })}
                    </Tag>,
                    statusTag,
                    visibilityTag
                  ]}
                  buttonOptions={
                    <Actions
                      data={data}
                      onSuccess={() => {
                        reload();
                      }}
                    />
                  }
                />
              }
            >
              <StateBar
                activeKey={activeKey}
                onChange={key => {
                  searchParams.set('tab', key);
                  setSearchParams(searchParams.toString());
                }}
                stateOption={[
                  { tab: formatMessage({ id: 'adminDocument.tabDetail.basicInfoTitle' }), key: 'basic' },
                  { tab: formatMessage({ id: 'adminDocument.tabDetail.contentPreviewTab' }), key: 'preview' }
                ]}
              />
              <ContentComponent data={data} reload={reload} />
            </Page>
          );
        }}
      />
    );
  })
);

export default TabDetail;
