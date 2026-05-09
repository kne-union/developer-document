import { useLoader } from '@kne/remote-loader';
import { Empty, Select, Tag, Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { useState } from 'react';
import MarkdownComponentsRender from '@kne/markdown-components-render';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
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

const ExampleRunner = withLocale(({ packageName, version }) => {
  const { formatMessage } = useIntl();
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
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'shared.npmPackage.exampleLoadFailed' })} />;
  }

  const target = targetModules[0];

  return <ExampleContent data={Object.values(target)[0]} />;
});

const NpmPackageDetailView = withLocale(({ data, headerExtra, simple }) => {
  const { formatMessage } = useIntl();
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
          <span className={styles.headerIdentityText}>{formatMessage({ id: 'shared.npmPackage.identityLabel' })}</span>
        </div>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <Title level={2} className={styles.pageTitle}>
              {data.name || data.packageName}
            </Title>
            {!simple && (
              <>
                <Paragraph className={styles.pageDescription}>{data.description || formatMessage({ id: 'shared.npmPackage.defaultDescription' })}</Paragraph>
                <div className={styles.tagRow}>
                  <Tag className={styles.tagTone}>{formatMessage({ id: `shared.catalogMeta.${type}` })}</Tag>
                  {data.latestVersion && <Tag className={styles.tagToneSoft}>v{data.latestVersion}</Tag>}
                  <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? formatMessage({ id: 'common.public' }) : formatMessage({ id: 'common.private' })}</Tag>
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
            <MetaItem label={formatMessage({ id: 'shared.npmPackage.exampleVersionLabel' })} value={examples.length > 0 ? `${examples.length}` : formatMessage({ id: 'shared.npmPackage.noExamples' })} />
            <MetaItem label={formatMessage({ id: 'shared.npmPackage.repoLinkLabel' })} value={`${repositoryData.length}`} />
          </div>
        )}
      </section>

      {examples.length > 0 ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <Title level={4} className={styles.sectionTitle}>
                {formatMessage({ id: 'shared.npmPackage.onlineExamplesTitle' })}
              </Title>
              <p className={styles.sectionDesc}>{formatMessage({ id: 'shared.npmPackage.onlineExamplesDesc' })}</p>
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
          {data.readme ? <MarkdownComponentsRender>{data.readme}</MarkdownComponentsRender> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'shared.npmPackage.noReadme' })} />}
        </section>
      )}
    </div>
  );
});

export default NpmPackageDetailView;
