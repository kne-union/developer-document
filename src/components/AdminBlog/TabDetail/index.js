import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams } from 'react-router-dom';
import Actions from '../Actions';
import { Tag, Space } from 'antd';
import dayjs from 'dayjs';

const Basic = createWithRemoteLoader({
  modules: ['components-core:InfoPage', 'components-core:Descriptions']
})(({ remoteModules, data }) => {
  const [InfoPage, Descriptions] = remoteModules;

  const groupsMap = {
    tech: '技术',
    life: '生活',
    product: '产品',
    design: '设计',
    other: '其他'
  };

  return (
    <InfoPage>
      <InfoPage.Part title="基本信息">
        <Descriptions
          dataSource={[
            [{ label: 'ID', content: data.id }],
            [{ label: '标题', content: data.title }],
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
                      <Tag key={group}>{groupsMap[group] || group}</Tag>
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
                label: '发布时间',
                content: data.publishTime ? dayjs(data.publishTime).format('YYYY-MM-DD HH:mm:ss') : '-'
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

const Content = createWithRemoteLoader({
  modules: ['components-core:InfoPage', 'components-thirdparty:CKEditor']
})(({ remoteModules, data }) => {
  const [InfoPage, CKEditor] = remoteModules;

  return (
    <InfoPage>
      <InfoPage.Part title="博客内容">
        <CKEditor.Content>{data.content}</CKEditor.Content>
      </InfoPage.Part>
    </InfoPage>
  );
});

const contentMap = {
  basic: Basic,
  content: Content
};

const TabDetail = createWithRemoteLoader({
  modules: ['components-core:Layout@StateBarPage', 'components-core:Layout@PageHeader', 'components-core:Global@usePreset']
})(({ remoteModules, ...props }) => {
  const [StateBarPage, PageHeader, usePreset] = remoteModules;
  const { apis } = usePreset();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Fetch
      {...Object.assign({}, apis.blog.detail, { params: { id: searchParams.get('id') } })}
      render={({ data, reload }) => {
        const activeKey = searchParams.get('tab') || 'basic';
        const ContentComponent = contentMap[activeKey] || Basic;
        const statusTag = data.status === 'published' ? <Tag color="success">已发布</Tag> : <Tag color="warning">草稿</Tag>;

        return (
          <StateBarPage
            {...props}
            headerFixed={false}
            header={
              <PageHeader
                title={data.title}
                info={`ID: ${data.id}`}
                tags={[statusTag]}
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
                { tab: '博客内容', key: 'content' }
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
