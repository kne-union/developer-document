import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Fetch from '@kne/react-fetch';
import { Button, Empty, Select, Space, Tag, Typography } from 'antd';
import { GithubOutlined, LinkOutlined } from '@ant-design/icons';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { useMemo, useState } from 'react';
import MarkdownComponentsRender from '@kne/markdown-components-render';
import { NPM_PACKAGE_TYPE_LABELS } from '@components/Shared/catalogMeta';
import { hasUserToken } from '@components/Shared/auth';
import styles from '@components/Shared/detailPage.module.scss';

const ExampleContent = createEntry.ExampleContent;
const { Title, Paragraph, Text } = Typography;

const MetaItem = ({ label, value }) => {
  return (
    <div className={styles.metaItem}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>{value}</div>
    </div>
  );
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
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="示例加载失败，请稍后重试" />;
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
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState(null);

  const isLoggedIn = useMemo(() => hasUserToken(), []);
  const apiConfig = isLoggedIn ? apis.npmPackage.detail : apis.npmPackage.publicDetail || apis.npmPackage.detail;

  return (
    <Fetch
      {...Object.assign({}, apiConfig, {
        params: { id: searchParams.get('id') }
      })}
      render={({ data }) => {
        if (!data) {
          return (
            <Page name="npm-package-detail">
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到对应组件" />
                </div>
              </div>
            </Page>
          );
        }

        if (!isLoggedIn && !data.isPublic) {
          return (
            <Page name="npm-package-detail">
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Title level={4}>该组件未公开</Title>
                  <Paragraph>登录后可查看完整信息与示例。</Paragraph>
                  <Button type="primary" onClick={() => navigate('/account/login')}>
                    去登录
                  </Button>
                </div>
              </div>
            </Page>
          );
        }

        const repositoryData = data.repositoryData || [];
        const type = data.type || 'other';
        const examples = data.examples || [];
        const currentVersion = selectedVersion || data.latestVersion;

        return (
          <Page name="npm-package-detail">
            <div className={styles.page}>
              <section className={`${styles.headerCard} ${styles.headerCardNpm}`}>
                <div className={styles.headerTop}>
                  <div className={styles.headerContent}>
                    <Title level={2} className={styles.pageTitle}>
                      {data.name || data.packageName}
                    </Title>
                    <Paragraph className={styles.pageDescription}>{data.description || '该组件提供标准化的能力封装，可用于快速接入和示例验证。'}</Paragraph>
                    <div className={styles.tagRow}>
                      <Tag className={styles.tagTone}>{NPM_PACKAGE_TYPE_LABELS[type] || type}</Tag>
                      {data.latestVersion && <Tag className={styles.tagToneSoft}>v{data.latestVersion}</Tag>}
                      <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? '公开' : '私有'}</Tag>
                    </div>
                  </div>
                </div>
                <div className={styles.metaGrid}>
                  <MetaItem label="Package Name" value={<Text copyable={{ text: data.packageName }}>{data.packageName}</Text>} />
                  <MetaItem label="Registry" value={data.registry || 'https://registry.npmjs.org/'} />
                  <MetaItem label="示例版本" value={examples.length > 0 ? `${examples.length} 个` : '无'} />
                  <MetaItem label="仓库链接" value={`${repositoryData.length} 个`} />
                </div>
              </section>

              {examples.length > 0 ? (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <Title level={4} className={styles.sectionTitle}>
                        在线示例
                      </Title>
                      <p className={styles.sectionDesc}>支持按版本切换示例，便于对比不同版本的输出效果。</p>
                    </div>
                    <Select style={{ width: 220 }} options={examples.map(v => ({ label: `v${v}`, value: v }))} value={currentVersion} onChange={setSelectedVersion} />
                  </div>
                  <div className={styles.exampleWrap}>
                    <ExampleRunner packageName={data.packageName} version={currentVersion} />
                  </div>
                </section>
              ) : (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <Title level={4} className={styles.sectionTitle}>
                        README
                      </Title>
                    </div>
                  </div>
                  {data.readme ? <MarkdownComponentsRender>{data.readme}</MarkdownComponentsRender> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文档内容" />}
                </section>
              )}
            </div>
          </Page>
        );
      }}
    />
  );
});

export default Detail;
