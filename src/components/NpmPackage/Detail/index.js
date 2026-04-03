import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import Fetch from '@kne/react-fetch';
import { Card, Descriptions, Tag, Typography, Button, Space, Select } from 'antd';
import { GithubOutlined, LinkOutlined } from '@ant-design/icons';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { useState, useMemo } from 'react';
import MarkdownComponentsRender from '@kne/markdown-components-render';

const ExampleContent = createEntry.ExampleContent;

const { Title, Paragraph } = Typography;

const TYPE_LABELS = {
  frontend: '前端组件',
  nodejs: 'NodeJS',
  engineering: '工程化',
  miniprogram: '小程序',
  prompts: 'Prompts',
  other: '其他'
};

const TYPE_COLORS = {
  frontend: 'blue',
  nodejs: 'green',
  engineering: 'orange',
  miniprogram: 'cyan',
  prompts: 'purple',
  other: 'default'
};

const ExampleRunner = ({ packageName, version }) => {
  const name = packageName.replace(/^@kne\//, '');
  const {
    loading,
    error,
    remoteModules: targetModules
  } = useLoader({
    modules: ['components'],
    options: {
      url: `${window.location.origin}/@kne-components/${name}/${version}/build`,
      tpl: '{{url}}',
      remote: name,
      version
    }
  });
  if (loading) {
    return null;
  }
  if (error) {
    return <div>加载远程组件库可能不符合规范，您可以向开发者报告该问题</div>;
  }
  const target = targetModules[0];

  return <ExampleContent data={Object.values(target)[0]} />;
};

const Detail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(({ remoteModules }) => {
  const [usePreset, Page] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const [selectedVersion, setSelectedVersion] = useState(null);

  return (
    <Fetch
      {...Object.assign({}, apis.npmPackage.detail, {
        params: { id: searchParams.get('id') }
      })}
      render={({ data }) => {
        const repositoryData = data.repositoryData || [];
        const type = data.type || 'other';
        const examples = data.examples || [];
        const currentVersion = selectedVersion || data.latestVersion;

        return (
          <Page name="npm-package-detail">
            <Card>
              <div style={{ marginBottom: 24 }}>
                <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                      {data.name || data.packageName}
                    </Title>
                    <Space>
                      <Tag color={TYPE_COLORS[type] || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
                        {TYPE_LABELS[type] || type}
                      </Tag>
                      {data.latestVersion && (
                        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                          v{data.latestVersion}
                        </Tag>
                      )}
                    </Space>
                  </div>
                  <Space>
                    {repositoryData.map((repo, index) => (
                      <Button key={index} type={repo.type === 'homepage' ? 'primary' : 'default'} icon={repo.type === 'git' ? <GithubOutlined /> : <LinkOutlined />} href={repo.url} target="_blank">
                        {repo.type === 'git' ? '仓库' : repo.type === 'homepage' ? '主页' : '链接'}
                      </Button>
                    ))}
                    <Button icon={<LinkOutlined />} href={`https://www.npmjs.com/package/${data.packageName}`} target="_blank">
                      NPM
                    </Button>
                  </Space>
                </Space>
              </div>

              {data.description && <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>{data.description}</Paragraph>}

              <Descriptions column={2} bordered>
                <Descriptions.Item label="Package Name">
                  <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{data.packageName}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Registry">{data.registry || 'https://registry.npmjs.org/'}</Descriptions.Item>
                <Descriptions.Item label="最新版本">{data.latestVersion || '-'}</Descriptions.Item>
                <Descriptions.Item label="是否公开">
                  <Tag color={data.isPublic ? 'success' : 'warning'}>{data.isPublic ? '公开' : '私有'}</Tag>
                </Descriptions.Item>
                {repositoryData.length > 0 && (
                  <Descriptions.Item label="仓库信息" span={2}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {repositoryData.map((repo, index) => (
                        <Space key={index}>
                          {repo.type === 'git' && <GithubOutlined />}
                          {repo.type === 'homepage' && <LinkOutlined />}
                          <a href={repo.url} target="_blank" rel="noopener noreferrer">
                            {repo.url}
                          </a>
                        </Space>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
            {examples.length > 0 ? (
              <Card style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 16 }}>
                  <Select style={{ width: 200 }} options={examples.map(v => ({ label: `v${v}`, value: v }))} value={currentVersion} onChange={setSelectedVersion} />
                </div>
                <ExampleRunner packageName={data.packageName} version={currentVersion} />
              </Card>
            ) : (
              data.readme && <MarkdownComponentsRender>{data.readme}</MarkdownComponentsRender>
            )}
          </Page>
        );
      }}
    />
  );
});

export default Detail;
