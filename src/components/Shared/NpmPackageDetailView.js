import { useLoader } from '@kne/remote-loader';
import { Empty, Select, Tag, Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { useState } from 'react';
import MarkdownComponentsRender from '@kne/markdown-components-render';
import { NPM_PACKAGE_TYPE_LABELS } from '@components/Shared/catalogMeta';
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

const NpmPackageDetailView = ({ data, headerExtra, simple }) => {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const repositoryData = data.repositoryData || [];
  const type = data.type || 'other';
  const examples = data.examples || [];
  const currentVersion = selectedVersion || data.latestVersion;

  return (
    <div className={styles.page}>
      <section className={`${styles.headerCard} ${styles.headerCardNpm}`}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <AppstoreOutlined />
          </span>
          <span className={styles.headerIdentityText}>组件</span>
        </div>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <Title level={2} className={styles.pageTitle}>
              {data.name || data.packageName}
            </Title>
            {!simple && (
              <>
                <Paragraph className={styles.pageDescription}>{data.description || '该组件提供标准化的能力封装，可用于快速接入和示例验证。'}</Paragraph>
                <div className={styles.tagRow}>
                  <Tag className={styles.tagTone}>{NPM_PACKAGE_TYPE_LABELS[type] || type}</Tag>
                  {data.latestVersion && <Tag className={styles.tagToneSoft}>v{data.latestVersion}</Tag>}
                  <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? '公开' : '私有'}</Tag>
                </div>
              </>
            )}
          </div>
          {headerExtra}
        </div>
        {!simple && (
          <div className={styles.metaGrid}>
            <MetaItem label="Package Name" value={<Text copyable={{ text: data.packageName }}>{data.packageName}</Text>} />
            <MetaItem label="Registry" value={data.registry || 'https://registry.npmjs.org/'} />
            <MetaItem label="示例版本" value={examples.length > 0 ? `${examples.length} 个` : '无'} />
            <MetaItem label="仓库链接" value={`${repositoryData.length} 个`} />
          </div>
        )}
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
  );
};

export default NpmPackageDetailView;
