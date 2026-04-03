import { createWithRemoteLoader, useLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import Fetch from '@kne/react-fetch';
import { Button, Empty, Select, Tag, Typography } from 'antd';
import { ApiOutlined, CodeOutlined } from '@ant-design/icons';
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
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="加载示例失败，请检查组件包构建产物" />;
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
    <Page name="admin-npm-package-detail">
      <Fetch
        {...Object.assign({}, apis.npmPackage.detail, {
          params: { id: searchParams.get('id') }
        })}
        render={({ data }) => {
          if (!data) {
            return (
              <div className={styles.page}>
                <div className={styles.emptyCard}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到对应 NPM 组件" />
                </div>
              </div>
            );
          }

          const type = data.type || 'other';
          const examples = data.examples || [];
          const currentVersion = selectedVersion || data.latestVersion;

          return (
            <div className={styles.page}>
              <section className={`${styles.headerCard} ${styles.headerCardNpm}`}>
                <div className={styles.headerTop}>
                  <div className={styles.headerContent}>
                    <Title level={2} className={styles.pageTitle}>
                      {data.name || data.packageName}
                    </Title>
                    <Paragraph className={styles.pageDescription}>{data.description || '后台查看组件基础信息、公开状态及示例版本。'}</Paragraph>
                    <div className={styles.tagRow}>
                      <Tag icon={<ApiOutlined />} className={styles.tagTone}>
                        {NPM_PACKAGE_TYPE_LABELS[type] || type}
                      </Tag>
                      {data.latestVersion && <Tag className={styles.tagToneSoft}>v{data.latestVersion}</Tag>}
                      <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? '公开' : '私有'}</Tag>
                    </div>
                  </div>
                  <div className={styles.headerActions}>
                    <Button icon={<CodeOutlined />}>示例 {examples.length}</Button>
                  </div>
                </div>
                <div className={styles.metaGrid}>
                  <MetaItem label="Package Name" value={<Text copyable={{ text: data.packageName }}>{data.packageName}</Text>} />
                  <MetaItem label="Registry" value={data.registry || '-'} />
                  <MetaItem label="最新版本" value={data.latestVersion || '-'} />
                  <MetaItem label="显示名称" value={data.name || '-'} />
                </div>
              </section>

              {examples.length > 0 ? (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <Title level={4} className={styles.sectionTitle}>
                        在线示例
                      </Title>
                      <p className={styles.sectionDesc}>支持后台快速切换版本，核验示例构建是否可用。</p>
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
        }}
      />
    </Page>
  );
});

export default Detail;
