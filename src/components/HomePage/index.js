import React from 'react';
import { Typography, Row, Col, Card, Button, Divider, Space } from 'antd';
import { GithubOutlined, RocketOutlined, ApiOutlined, ToolOutlined } from '@ant-design/icons';
import styles from './style.module.scss';

const { Title, Paragraph, Text } = Typography;

const FeatureCard = ({ icon, title, description }) => (
  <Card className={styles.featureCard}>
    <div className={styles.featureIcon}>{icon}</div>
    <Title level={4}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

const ComponentCard = ({ title, description, preview }) => (
  <Card className={styles.componentCard} hoverable>
    <div className={styles.componentPreview}>{preview}</div>
    <Divider />
    <Title level={5}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

const HomePage = () => {
  return (
    <div className={styles.homePage}>
      {/* 顶部横幅 */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <Title>KNE 组件库</Title>
          <Paragraph className={styles.bannerDescription}>一套高质量、可定制的 React 组件库，帮助开发者快速构建现代化的用户界面</Paragraph>
          <Space size="large">
            <Button type="primary" size="large" icon={<RocketOutlined />}>
              快速开始
            </Button>
            <Button size="large" icon={<GithubOutlined />}>
              GitHub
            </Button>
          </Space>
        </div>
      </div>

      {/* 特性部分 */}
      <div className={styles.section}>
        <Title level={2} className={styles.sectionTitle}>
          特性
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <FeatureCard icon={<RocketOutlined className={styles.featureIconSvg} />} title="高性能" description="采用现代化的技术栈，确保组件运行高效，提供流畅的用户体验" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FeatureCard icon={<ToolOutlined className={styles.featureIconSvg} />} title="可定制" description="提供丰富的配置选项和主题系统，满足不同项目的个性化需求" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FeatureCard icon={<ApiOutlined className={styles.featureIconSvg} />} title="API友好" description="简洁一致的API设计，降低学习成本，提高开发效率" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FeatureCard icon={<GithubOutlined className={styles.featureIconSvg} />} title="开源共建" description="开放源代码，欢迎社区贡献，共同打造更好的组件库" />
          </Col>
        </Row>
      </div>

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
};

export default HomePage;
