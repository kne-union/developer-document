import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import Actions from '../Actions';
import { Tag, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from '../style.module.scss';
import { ShareButton, DocumentDetailView } from '@components/Shared';

const Basic = createWithRemoteLoader({
  modules: ['components-core:InfoPage', 'components-core:Descriptions']
})(({ remoteModules, data }) => {
  const [InfoPage, Descriptions] = remoteModules;

  return (
    <InfoPage>
      <InfoPage.Part title="基本信息">
        <Descriptions
          dataSource={[
            [{ label: 'ID', content: data.id }],
            [{ label: '名称', content: data.name }],
            [
              {
                label: '状态',
                content: data.status === 'published' ? '已发布' : '草稿'
              }
            ],
            [
              {
                label: '是否公开',
                content: data.isPublic ? '公开' : '私密'
              }
            ],
            [
              {
                label: '分组',
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
                label: '创建人',
                content: data.createdUser?.email || '-'
              }
            ],
            [
              {
                label: '创建时间',
                content: data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'
              }
            ]
          ]}
        />
      </InfoPage.Part>
    </InfoPage>
  );
});

const Preview = ({ data }) => {
  return <DocumentDetailView data={data} headerExtra={<ShareButton type="document" id={data.id} disabled={data.status !== 'published' || !data.isPublic} disabledReason={!data.isPublic ? '私密文档无法分享' : '未发布文档无法分享'} />} />;
};

const contentMap = {
  basic: Basic,
  preview: Preview
};

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@StateBarPage', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(({ remoteModules, ...props }) => {
  const [StateBarPage, PageHeader, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Fetch
      {...Object.assign({}, apis.document.detail, { params: { id: searchParams.get('id') } })}
      render={({ data, reload }) => {
        const activeKey = searchParams.get('tab') || 'basic';
        const ContentComponent = contentMap[activeKey] || Basic;
        const statusTag =
          data.status === 'published' ? (
            <Tag className={styles.statusTagPublished} icon={<CheckCircleOutlined />}>
              已发布
            </Tag>
          ) : (
            <Tag className={styles.statusTagDraft} icon={<ClockCircleOutlined />}>
              草稿
            </Tag>
          );
        const visibilityTag = data.isPublic ? (
          <Tag className={styles.visibilityTagPublic} icon={<EyeOutlined />}>
            公开
          </Tag>
        ) : (
          <Tag className={styles.visibilityTagPrivate} icon={<EyeInvisibleOutlined />}>
            私密
          </Tag>
        );

        return (
          <StateBarPage
            {...props}
            headerFixed={false}
            header={
              <PageHeader
                title={data.name}
                info={`ID: ${data.id}`}
                tags={[
                  <Tag className={styles.domainTag} icon={<FileTextOutlined />} key="domain">
                    文档管理
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
            stateBar={{
              activeKey,
              onChange: key => {
                searchParams.set('tab', key);
                setSearchParams(searchParams.toString());
              },
              stateOption: [
                { tab: '基本信息', key: 'basic' },
                { tab: '内容预览', key: 'preview' }
              ]
            }}
          >
            <ContentComponent data={data} reload={reload} />
          </StateBarPage>
        );
      }}
    />
  );
});

export default TabDetail;
