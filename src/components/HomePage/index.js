import React from 'react';
import classNames from 'classnames';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Button, Space, Tag } from 'antd';
import { GithubOutlined, AppstoreOutlined, RocketOutlined, CodeOutlined, DeploymentUnitOutlined, FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { IconDisplay } from '@kne/antd-icon-select';
import { Zsh } from '@kne/react-box';
import styles from './style.module.scss';

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

export const FeatureSection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <Title level={2} className={styles.sectionTitle}>
            核心能力
          </Title>
          <Paragraph className={styles.sectionDescription}>围绕企业级前端开发场景，统一沉淀可复用、可扩展、可快速落地的基础能力。</Paragraph>
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
};

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

const ResourceCard = ({ tone = 'npm', icon, title, description, onClick }) => {
  const toneStyle = toneStyleMap[tone] || toneStyleMap.npm;

  return (
    <button type="button" className={classNames(styles.resourceCard, styles[toneStyle.card])} onClick={onClick}>
      <div className={classNames(styles.resourceIcon, styles[toneStyle.icon])}>{icon}</div>
      <Title level={4} className={styles.cardTitle}>
        {title}
      </Title>
      <Paragraph className={styles.cardText}>{description}</Paragraph>
      <span className={classNames(styles.cardAction, styles[toneStyle.action])}>
        进入页面
        <ArrowRightOutlined />
      </span>
    </button>
  );
};

const HomePage = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { setting } = usePreset();
  const navigate = useNavigate();
  const data = setting.profile || {};
  const features = data.features || [];

  const stats = [
    { label: '核心特性', value: `${features.length || 0}+` },
    { label: '内容入口', value: '4' },
    { label: '主题风格', value: data.theme || '#4183F0' }
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
            企业级前端资源中心
          </Tag>
          <Title className={styles.heroTitle}>{data.name || 'KNE UNION'}</Title>
          <Paragraph className={styles.heroDescription}>{data.description || data.slogan || '统一沉淀组件、远程模块、文档示例与最佳实践，帮助团队构建更稳定、更高效的前端交付体系。'}</Paragraph>
          <Space size={12} wrap className={styles.heroActions}>
            <Button type="primary" size="large" icon={<AppstoreOutlined />} className={classNames(styles['primaryAction'], styles['actionNpm'])} onClick={() => navigate('/npm-packages')}>
              浏览组件
            </Button>
            <Button size="large" icon={<DeploymentUnitOutlined />} className={styles['actionRemote']} onClick={() => navigate('/remote-components')}>
              远程组件
            </Button>
            <Button size="large" icon={<FileTextOutlined />} className={styles['actionBlog']} onClick={() => navigate('/blog')}>
              查看博客
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
              <Text className={styles.panelEyebrow}>平台概览</Text>
              <Title level={4} className={styles.panelTitle}>
                面向组件化与规范化交付
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
                <span>统一入口，快速检索资源</span>
              </div>
              <div className={styles.inlineListItem}>
                <CodeOutlined />
                <span>保留代码示例与文档链路</span>
              </div>
              <div className={styles.inlineListItem}>
                <DeploymentUnitOutlined />
                <span>支持远程组件与业务复用</span>
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
              快速开始
            </Title>
            <Paragraph className={styles.sectionDescription}>保留简洁的初始化路径，让新项目、组件接入与文档浏览都能在更短时间内完成。</Paragraph>
          </div>
        </div>
        <div className={styles.quickStartPanel}>
          <div className={styles.quickStartContent}>
            <Space direction="vertical" size={14}>
              <div className={styles.inlineListItem}>
                <RocketOutlined />
                <span>使用统一命令完成项目初始化</span>
              </div>
              <div className={styles.inlineListItem}>
                <AppstoreOutlined />
                <span>快速进入组件与远程模块资源页</span>
              </div>
              <div className={styles.inlineListItem}>
                <CodeOutlined />
                <span>直接查看示例与 README 文档</span>
              </div>
            </Space>
          </div>
          <Zsh title="终端 — zsh" padding="32px" radius="12px">
            <div style={{ color: '#1f2937' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                <span>npm init @kne/union-app my-dashboard</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                <span>cd my-dashboard</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                <span>npm install</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>$</span>
                <span>npm run start</span>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <p style={{ margin: 0 }}>成功！项目已创建并启动</p>
              </div>
            </div>
          </Zsh>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <Title level={2} className={styles.sectionTitle}>
              资源入口
            </Title>
            <Paragraph className={styles.sectionDescription}>围绕组件、远程模块、博客与站点信息构建更清晰的资源导航。</Paragraph>
          </div>
        </div>
        <div className={styles.resourceGrid}>
          <ResourceCard tone="npm" icon={<AppstoreOutlined />} title="组件资源" description="查看组件包信息、版本、示例与 README 文档。" onClick={() => navigate('/npm-packages')} />
          <ResourceCard tone="remote" icon={<DeploymentUnitOutlined />} title="远程组件" description="浏览远程模块、分组信息与在线示例能力。" onClick={() => navigate('/remote-components')} />
          <ResourceCard tone="blog" icon={<FileTextOutlined />} title="博客内容" description="查看技术、产品、设计等主题内容沉淀。" onClick={() => navigate('/blog')} />
        </div>
      </section>

      <section className={styles.footerCta}>
        <div>
          <Title level={3} className={styles.footerTitle}>
            从资源检索到示例验证，保持统一体验
          </Title>
          <Paragraph className={styles.footerDescription}>参考设计稿中的层级与卡片组织方式，同时保留当前项目更适合文档站的信息密度与简洁交互。</Paragraph>
        </div>
        <Button type="primary" className={styles['actionNpm']} onClick={() => navigate('/npm-packages')}>
          开始浏览
        </Button>
      </section>
    </div>
  );
});

export default HomePage;
