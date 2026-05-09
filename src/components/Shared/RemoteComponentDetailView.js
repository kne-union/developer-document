import { useLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import createEntry from '@kne/modules-dev/dist/create-entry.modern';
import '@kne/modules-dev/dist/create-entry.css';
import { Empty, Tag, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import { REMOTE_COMPONENT_GROUP_LABELS } from '@components/Shared/catalogMeta';
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

const ComponentExample = ({ remote, tpl, url, defaultVersion, current, examples }) => {
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
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="加载远程组件库失败，请稍后重试" />;
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
};

const RemoteComponentDetailView = ({ data, headerExtra, current, simple }) => {
  const group = data.group || 'common';

  return (
    <div className={styles.page}>
      <section className={`${styles.headerCard} ${styles.headerCardRemote}`}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <CloudServerOutlined />
          </span>
          <span className={styles.headerIdentityText}>远程组件</span>
        </div>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <Title level={2} className={styles.pageTitle}>
              {data.name || data.remote}
            </Title>
            {!simple && (
              <>
                <Paragraph className={styles.pageDescription}>{data.description || '用于业务模块或微前端场景下的远程能力接入与示例验证。'}</Paragraph>
                <div className={styles.tagRow}>
                  <Tag className={styles.tagTone}>{REMOTE_COMPONENT_GROUP_LABELS[group] || group}</Tag>
                  <Tag className={styles.tagToneSoft}>{data.defaultVersion || 'latest'}</Tag>
                  <Tag className={data.isPublic ? styles.tagStatePublic : styles.tagStatePrivate}>{data.isPublic ? '公开' : '私有'}</Tag>
                </div>
              </>
            )}
          </div>
          {headerExtra}
        </div>
        {!simple && (
          <div className={styles.metaGrid}>
            <MetaItem label="Remote 名称" value={<Text copyable={{ text: data.remote }}>{data.remote}</Text>} />
            <MetaItem label="NPM 包名" value={data.packageName || '-'} />
            <MetaItem label="默认版本" value={data.defaultVersion || '-'} />
            <MetaItem label="加载模版" value={data.tpl || '-'} />
          </div>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <Title level={4} className={styles.sectionTitle}>
              示例文档
            </Title>
            <p className={styles.sectionDesc}>参考设计稿中的文档页结构，保留顶部摘要，示例区域继续复用现有 ExamplePage 能力。</p>
          </div>
        </div>
        <ComponentExample {...data} current={current} />
      </section>
    </div>
  );
};

export default RemoteComponentDetailView;
