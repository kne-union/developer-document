import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import Fetch from '@kne/react-fetch';
import { Card, Descriptions, Tag, Typography, Flex, Select } from 'antd';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { useState } from 'react';
import MarkdownComponentsRender from '@kne/markdown-components-render';

const ExampleContent = createEntry.ExampleContent;

const { Title } = Typography;

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
    <Page name="npm-package-detail">
      <Fetch
        {...Object.assign({}, apis.npmPackage.detail, {
          params: { id: searchParams.get('id') }
        })}
        render={({ data }) => {
          const type = data.type || 'other';
          const examples = data.examples || [];
          const currentVersion = selectedVersion || data.latestVersion;

          return (
            <Flex vertical gap={12}>
              <Card>
                <Title level={4} style={{ marginBottom: 24 }}>
                  {data.name || data.packageName}
                </Title>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Package Name">{data.packageName}</Descriptions.Item>
                  <Descriptions.Item label="显示名称">{data.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="类型">
                    <Tag color={TYPE_COLORS[type] || 'default'}>{TYPE_LABELS[type] || type}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="最新版本">{data.latestVersion || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Registry">{data.registry || '-'}</Descriptions.Item>
                  <Descriptions.Item label="是否公开">
                    <Tag color={data.isPublic ? 'success' : 'warning'}>{data.isPublic ? '是' : '否'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="描述" span={2}>
                    {data.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              {examples.length > 0 ? (
                <Card>
                  <div style={{ marginBottom: 16 }}>
                    <Select style={{ width: 200 }} options={examples.map(v => ({ label: `v${v}`, value: v }))} value={currentVersion} onChange={setSelectedVersion} />
                  </div>
                  <ExampleRunner packageName={data.packageName} version={currentVersion} />
                </Card>
              ) : (
                data.readme && <MarkdownComponentsRender>{data.readme}</MarkdownComponentsRender>
              )}
            </Flex>
          );
        }}
      />
    </Page>
  );
});

export default Detail;
