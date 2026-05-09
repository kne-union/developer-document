import React from 'react';
import classNames from 'classnames';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Button, Space, Tag } from 'antd';
import { GithubOutlined, AppstoreOutlined, RocketOutlined, CodeOutlined, DeploymentUnitOutlined, FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { IconDisplay } from '@kne/antd-icon-select';
import { Zsh } from '@kne/react-box';
import styles from './style.module.scss';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const { Title, Paragraph, Text } = Typography;

export const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <Title level={4} className={styles.cardTitle}>
        {title}
      </Title>
      <Paragraph className={styles.cardText}>{description}</Paragraph>
    </div>
  );
};

export const FeatureSection = withLocale(({ data = [] }) => {
  const { formatMessage } = useIntl();
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <Title level={2} className={styles.sectionTitle}>
            {formatMessage({ id: 'home.featureSectionTitle' })}
          </Title>
          <Paragraph className={styles.sectionDescription}>{formatMessage({ id: 'home.featureSectionDesc' })}</Paragraph>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} sm={12} lg={6} key={index}>
              <FeatureCard icon={<IconDisplay type={item.icon} />} title={item.title} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </section>
  );
});

const toneStyleMap = {
  npm: {
    card: 'resourceCardNpm',
    icon: 'resourceIconNpm',
    action: 'cardActionNpm'
  },
  remote: {
    card: 'resourceCardRemote',
    icon: 'resourceIconRemote',
    action: 'cardActionRemote'
  },
  blog: {
    card: 'resourceCardBlog',
    icon: 'resourceIconBlog',
    action: 'cardActionBlog'
  }
};

const ResourceCard = withLocale(({ tone = 'npm', icon, title, description, onClick }) => {
  const toneStyle = toneStyleMap[tone] || toneStyleMap.npm;
  const { formatMessage } = useIntl();

  return (
    <button type="button" className={classNames(styles.resourceCard, styles[toneStyle.card])} onClick={onClick}>
      <div className={classNames(styles.resourceIcon, styles[toneStyle.icon])}>{icon}</div>
      <Title level={4} className={styles.cardTitle}>
        {title}
      </Title>
      <Paragraph className={styles.cardText}>{description}</Paragraph>
      <span className={classNames(styles.cardAction, styles[toneStyle.action])}>
        {formatMessage({ id: 'home.resourceCardAction' })}
        <ArrowRightOutlined />
      </span>
    </button>
  );
});

const HomePage = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { setting } = usePreset();
    const navigate = useNavigate();
    const data = setting.profile || {};
    const features = data.features || [];
    const { formatMessage } = useIntl();

    const stats = [
      { label: formatMessage({ id: 'home.statCoreFeatures' }), value: `${features.length || 0}+` },
      { label: formatMessage({ id: 'home.statContentEntries' }), value: '4' },
      { label: formatMessage({ id: 'home.statThemeStyle' }), value: data.theme || '#4183F0' }
    ];

    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles['heroBackdrop']} aria-hidden>
            <span className={styles['heroBlobPrimary']} />
            <span className={styles['heroBlobSecondary']} />
            <span className={styles['heroGrid']} />
          </div>
          <div className={styles['heroContent']}>
            <Tag bordered={false} className={styles.heroTag}>
              <AppstoreOutlined />
              {formatMessage({ id: 'home.heroTag' })}
            </Tag>
            <Title className={styles.heroTitle}>{data.name || 'KNE UNION'}</Title>
            <Paragraph className={styles.heroDescription}>{data.description || data.slogan || formatMessage({ id: 'home.heroDefaultDescription' })}</Paragraph>
            <Space size={12} wrap className={styles.heroActions}>
              <Button type="primary" size="large" icon={<AppstoreOutlined />} className={classNames(styles['primaryAction'], styles['actionNpm'])} onClick={() => navigate('/npm-packages')}>
                {formatMessage({ id: 'home.btnBrowseComponents' })}
              </Button>
              <Button size="large" icon={<DeploymentUnitOutlined />} className={styles['actionRemote']} onClick={() => navigate('/remote-components')}>
                {formatMessage({ id: 'home.btnRemoteComponents' })}
              </Button>
              <Button size="large" icon={<FileTextOutlined />} className={styles['actionBlog']} onClick={() => navigate('/blog')}>
                {formatMessage({ id: 'home.btnViewBlog' })}
              </Button>
              {data.github && (
                <Button size="large" icon={<GithubOutlined />} className={styles['actionGithub']} href={data.github} target="_blank">
                  GitHub
                </Button>
              )}
            </Space>
          </div>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className={styles.metricsPanel}>
              <div className={styles.metricsHeader}>
                <Text className={styles.panelEyebrow}>{formatMessage({ id: 'home.metricsEyebrow' })}</Text>
                <Title level={4} className={styles.panelTitle}>
                  {formatMessage({ id: 'home.metricsTitle' })}
                </Title>
              </div>
              <div className={styles.metricsGrid}>
                {stats.map(item => {
                  return (
                    <div className={styles.metricCard} key={item.label}>
                      <div className={styles.metricLabel}>{item.label}</div>
                      <div className={styles.metricValue}>{item.value}</div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.inlineList}>
                <div className={styles.inlineListItem}>
                  <RocketOutlined />
                  <span>{formatMessage({ id: 'home.inlineListUnifiedEntry' })}</span>
                </div>
                <div className={styles.inlineListItem}>
                  <CodeOutlined />
                  <span>{formatMessage({ id: 'home.inlineListCodeExamples' })}</span>
                </div>
                <div className={styles.inlineListItem}>
                  <DeploymentUnitOutlined />
                  <span>{formatMessage({ id: 'home.inlineListRemoteReuse' })}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FeatureSection data={features} />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <Title level={2} className={styles.sectionTitle}>
                {formatMessage({ id: 'home.quickStartTitle' })}
              </Title>
              <Paragraph className={styles.sectionDescription}>{formatMessage({ id: 'home.quickStartDesc' })}</Paragraph>
            </div>
          </div>
          <div className={styles.quickStartPanel}>
            <div className={styles.quickStartContent}>
              <Space direction="vertical" size={14}>
                <div className={styles.inlineListItem}>
                  <RocketOutlined />
                  <span>{formatMessage({ id: 'home.quickStartInit' })}</span>
                </div>
                <div className={styles.inlineListItem}>
                  <AppstoreOutlined />
                  <span>{formatMessage({ id: 'home.quickStartResources' })}</span>
                </div>
                <div className={styles.inlineListItem}>
                  <CodeOutlined />
                  <span>{formatMessage({ id: 'home.quickStartExamples' })}</span>
                </div>
                <div className={styles.inlineListItem}>
                  <FileTextOutlined />
                  <span>{formatMessage({ id: 'home.quickStartDeployPrompts' })}</span>
                </div>
              </Space>
            </div>
            <Zsh title={formatMessage({ id: 'home.terminalTitle' })} padding="32px" radius="12px">
              <div style={{ color: '#1f2937' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                  <span>npx @kne/npm-tools init my-project</span>
                </div>
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '0.75rem' }}>
                  <p style={{ margin: 0 }}>✔ NodeJS Libs</p>
                  <p style={{ margin: 0 }}>✔ Frontend Libs</p>
                  <p style={{ margin: 0 }}>✔ Remote Components</p>
                  <p style={{ margin: 0 }}>✔ Business Project</p>
                  <p style={{ margin: 0 }}>✔ WeChat Miniprogram Libs</p>
                  <p style={{ margin: 0 }}>✔ WeChat Miniprogram Project</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                  <span>cd my-project</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                  <span>npx @kne/npm-tools deployPrompts</span>
                </div>
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '0.75rem' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{formatMessage({ id: 'home.terminalSelectPrompts' })}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>❯ Fastify Project</p>
                  <p style={{ margin: '0.25rem 0 0' }}> Frontend Libs</p>
                  <p style={{ margin: '0.25rem 0 0' }}> Frontend Remote Components</p>
                  <p style={{ margin: '0.25rem 0 0' }}> Frontend Project</p>
                  <p style={{ margin: '0.25rem 0 0' }}> Node Libs</p>
                  <p style={{ margin: '0.25rem 0 0' }}> Fastify Libs</p>
                </div>
                <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a', color: '#854d0e', fontSize: '0.75rem' }}>
                  <p style={{ margin: 0 }}>{formatMessage({ id: 'home.terminalProcessingPackage1' })}</p>
                  <p style={{ margin: 0 }}>{formatMessage({ id: 'home.terminalProcessingPackage2' })}</p>
                  <p style={{ margin: 0 }}>{formatMessage({ id: 'home.terminalProcessingPackage3' })}</p>
                  <p style={{ margin: 0 }}>{formatMessage({ id: 'home.terminalProcessingPackage4' })}</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{formatMessage({ id: 'home.terminalDeployComplete' })}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                  <span>npm start</span>
                </div>
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  <p style={{ margin: 0 }}>{formatMessage({ id: 'home.terminalSuccess' })}</p>
                </div>
              </div>
            </Zsh>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <Title level={2} className={styles.sectionTitle}>
                {formatMessage({ id: 'home.resourceEntryTitle' })}
              </Title>
              <Paragraph className={styles.sectionDescription}>{formatMessage({ id: 'home.resourceEntryDesc' })}</Paragraph>
            </div>
          </div>
          <div className={styles.resourceGrid}>
            <ResourceCard tone="npm" icon={<AppstoreOutlined />} title={formatMessage({ id: 'home.resourceComponentTitle' })} description={formatMessage({ id: 'home.resourceComponentDesc' })} onClick={() => navigate('/npm-packages')} />
            <ResourceCard
              tone="remote"
              icon={<DeploymentUnitOutlined />}
              title={formatMessage({ id: 'home.resourceRemoteTitle' })}
              description={formatMessage({ id: 'home.resourceRemoteDesc' })}
              onClick={() => navigate('/remote-components')}
            />
            <ResourceCard tone="blog" icon={<FileTextOutlined />} title={formatMessage({ id: 'home.resourceBlogTitle' })} description={formatMessage({ id: 'home.resourceBlogDesc' })} onClick={() => navigate('/blog')} />
          </div>
        </section>

        <section className={styles.footerCta}>
          <div>
            <Title level={3} className={styles.footerTitle}>
              {formatMessage({ id: 'home.footerTitle' })}
            </Title>
            <Paragraph className={styles.footerDescription}>{formatMessage({ id: 'home.footerDesc' })}</Paragraph>
          </div>
          <Button type="primary" className={styles['actionNpm']} onClick={() => navigate('/npm-packages')}>
            {formatMessage({ id: 'home.footerBtnStart' })}
          </Button>
        </section>
      </div>
    );
  })
);

export default HomePage;
