import React from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Typography, Row, Col, Card, Button, Divider, Space } from 'antd';
import { GithubOutlined, RocketOutlined, ApiOutlined, ToolOutlined } from '@ant-design/icons';
import { IconDisplay } from '@kne/antd-icon-select';
import styles from './style.module.scss';

const { Title, Paragraph, Text } = Typography;

export const FeatureCard = ({ icon, title, description }) => (
  <Card className={styles.featureCard}>
    <div className={styles.featureIcon}>{icon}</div>
    <Title level={4}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

export const FeatureSection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Title level={2} className={styles.sectionTitle}>
        特性
      </Title>
      <Row gutter={[24, 24]}>
        {data.map((item, idnex) => {
          return (
            <Col xs={24} sm={12} lg={6} key={idnex}>
              <FeatureCard icon={<IconDisplay type={item.icon} />} title={item.title} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

const ComponentCard = ({ title, description, preview }) => (
  <Card className={styles.componentCard} hoverable>
    <div className={styles.componentPreview}>{preview}</div>
    <Divider />
    <Title level={5}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

const HomePage = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { setting } = usePreset();
  const data = setting['profile'];
  return (
    <div className={styles.homePage}>
      {/* 顶部横幅 */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <Title>{data.name}</Title>
          <Paragraph className={styles.bannerDescription}>{data.description}</Paragraph>
          <Space size="large">
            <Button type="primary" size="large" icon={<RocketOutlined />}>
              快速开始
            </Button>
            {data.github && (
              <Button size="large" icon={<GithubOutlined />} href={data.github}>
                GitHub
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* 特性部分 */}
      <FeatureSection data={data.features} />

      {/* 快速开始部分 */}
      <div className={`${styles.section} ${styles.quickStartSection}`}>
        <Title level={2} className={styles.sectionTitle}>
          快速开始
        </Title>
        <div className={styles.codeBlock}>
          <Text code>npm install @kne/components</Text>
        </div>
        <Paragraph className={styles.quickStartDescription}>安装完成后，你可以这样引入组件：</Paragraph>
        <div className={styles.codeBlock}>
          <Text code>{`import { Button } from '@kne/components';\n\nconst App = () => (\n  <Button type="primary">Hello World</Button>\n);`}</Text>
        </div>
        <Button type="primary" className={styles.docsButton}>
          查看文档
        </Button>
      </div>

      {/* 组件展示部分 */}
      <div className={styles.section}>
        <Title level={2} className={styles.sectionTitle}>
          核心组件
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}>
            <ComponentCard
              title="Button 按钮"
              description="常用的操作按钮，支持多种类型和状态"
              preview={
                <Space>
                  <Button type="primary">主按钮</Button>
                  <Button>次按钮</Button>
                  <Button type="dashed">虚线按钮</Button>
                </Space>
              }
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <ComponentCard
              title="Typography 排版"
              description="文本的基本格式，包括标题、段落、引用等"
              preview={
                <div>
                  <Title level={5}>标题</Title>
                  <Paragraph>这是一个段落示例</Paragraph>
                  <Text mark>标记文本</Text>
                </div>
              }
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <ComponentCard
              title="Card 卡片"
              description="容纳内容的灵活容器，可承载文字、列表、图片等"
              preview={
                <Card title="卡片标题" style={{ width: '100%' }}>
                  <p>卡片内容</p>
                </Card>
              }
            />
          </Col>
        </Row>
        <div className={styles.moreComponents}>
          <Button type="link">查看更多组件 →</Button>
        </div>
      </div>

      {/* 底部 */}
      <div className={styles.footer}>
        <Paragraph>KNE 组件库 © {new Date().getFullYear()} 版权所有</Paragraph>
        <Space>
          <Button type="link" icon={<GithubOutlined />}>
            GitHub
          </Button>
          <Button type="link">文档</Button>
          <Button type="link">更新日志</Button>
        </Space>
      </div>
    </div>
  );
});

export default HomePage;
