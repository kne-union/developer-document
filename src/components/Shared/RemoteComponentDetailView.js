import { useLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { Empty, Tag, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import styles from '@components/Shared/detailPage.module.scss';

const ExamplePage = createEntry.ExamplePage;
const { Title, Paragraph, Text } = Typography;

const MetaItem = ({ label, value }) => {
  return (
    <div className={styles.metaItem}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>{value}</div>
    </div>
  );
};

const ComponentExample = withLocale(({ remote, tpl, url, defaultVersion, current, examples }) => {
  const { formatMessage } = useIntl();
  const [, setSearchParams] = useSearchParams();
  const {
    loading,
    error,
    remoteModules: targetModules
  } = useLoader({
    modules: ['components'],
    options: url
      ? {
          url,
          tpl,
          remote,
          version: defaultVersion
        }
      : {
          url: window.location.origin,
          tpl: '{{url}}/@kne-components/{{remote}}/{{version}}/build',
          remote,
          version: examples[0]
        }
  });

  if (loading) {
    return null;
  }

  if (error) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'shared.remoteComponent.loadFailed' })} />;
  }

  const [components] = targetModules;
  let currentName = current;
  if (!(currentName && components[currentName])) {
    currentName = Object.keys(components)[0];
  }

  return (
    <div className={styles.exampleWrap}>
      <ExamplePage
        data={components[currentName]}
        current={currentName}
        menuProps={{
          onChange: name => {
            setSearchParams(previousSearchParams => {
              const nextSearchParams = new URLSearchParams(previousSearchParams);
              nextSearchParams.set('current', name);
              return nextSearchParams;
            });
          }
        }}
        items={Object.keys(components).map(name => {
          return {
            label: name,
            key: name
          };
        })}
      />
    </div>
  );
});

const RemoteComponentDetailView = withLocale(({ data, headerExtra, current, simple }) => {
  const { formatMessage } = useIntl();
  const group = data.group || 'common';

  return (
    <div className={styles.page}>
      <section className={`${styles.headerCard} ${styles.headerCardRemote}`}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <CloudServerOutlined />
          </span>
          <span className={styles.headerIdentityText}>{formatMessage({ id: 'shared.remoteComponent.identityLabel' })}</span>
        </div>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <Title level={2} className={styles.pageTitle}>
              {data.name || data.remote}
            </Title>
            {!simple && (
              <>
                <Paragraph className={styles.pageDescription}>{data.description || formatMessage({ id: 'shared.remoteComponent.defaultDescription' })}</Paragraph>
                <div className={styles.tagRow}>
                  <Tag className={styles.tagTone}>{formatMessage({ id: `shared.catalogMeta.${group}` })}</Tag>
                  <Tag className={styles.tagToneSoft}>{data.defaultVersion || 'latest'}</Tag>
                  <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? formatMessage({ id: 'common.public' }) : formatMessage({ id: 'common.private' })}</Tag>
                </div>
              </>
            )}
          </div>
          {headerExtra}
        </div>
        {!simple && (
          <div className={styles.metaGrid}>
            <MetaItem label={formatMessage({ id: 'shared.remoteComponent.remoteNameLabel' })} value={<Text copyable={{ text: data.remote }}>{data.remote}</Text>} />
            <MetaItem label={formatMessage({ id: 'shared.remoteComponent.npmPackageLabel' })} value={data.packageName || '-'} />
            <MetaItem label={formatMessage({ id: 'shared.remoteComponent.defaultVersionLabel' })} value={data.defaultVersion || '-'} />
            <MetaItem label={formatMessage({ id: 'shared.remoteComponent.loadTemplateLabel' })} value={data.tpl || '-'} />
          </div>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <Title level={4} className={styles.sectionTitle}>
              {formatMessage({ id: 'shared.remoteComponent.exampleDocTitle' })}
            </Title>
            <p className={styles.sectionDesc}>{formatMessage({ id: 'shared.remoteComponent.exampleDocDesc' })}</p>
          </div>
        </div>
        <ComponentExample {...data} current={current} />
      </section>
    </div>
  );
});

export default RemoteComponentDetailView;
