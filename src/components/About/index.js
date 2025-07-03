import React from 'react';
import { Typography, Row, Col, Card, Timeline, Statistic, Avatar } from 'antd';
import { RocketOutlined, TeamOutlined, BulbOutlined, TrophyOutlined, HeartOutlined, StarOutlined } from '@ant-design/icons';
import styles from './style.module.scss';

const { Title, Paragraph } = Typography;

const TeamMember = ({ avatar, name, role, description }) => (
  <Card className={styles.teamCard}>
    <div className={styles.memberAvatar}>
      <Avatar size={100} src={avatar}>
        {name.charAt(0)}
      </Avatar>
    </div>
    <Title level={4}>{name}</Title>
    <Title level={5} type="secondary">
      {role}
    </Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

const ValueCard = ({ icon, title, description }) => (
  <Card className={styles.valueCard}>
    <div className={styles.valueIcon}>{icon}</div>
    <Title level={4}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

const About = () => {
  return (
    <div className={styles.aboutPage}>
      {/* 公司简介部分 */}
      {/*<div className={styles.hero}>
        <div className={styles.heroContent}>
          <Title>追求卓越 创新未来</Title>
          <Paragraph className={styles.heroDescription}>
            我们致力于为客户提供最优质的技术解决方案，用创新改变世界
          </Paragraph>
        </div>
      </div>*/}

      {/* 公司数据统计 */}
      <div className={styles.statsSection}>
        <Row gutter={[32, 32]} justify="center">
          <Col xs={12} sm={6}>
            <Statistic title="服务客户" value={1000} prefix={<TeamOutlined />} suffix="+" />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="团队成员" value={100} prefix={<HeartOutlined />} suffix="+" />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="项目案例" value={500} prefix={<TrophyOutlined />} suffix="+" />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="技术专利" value={50} prefix={<BulbOutlined />} suffix="+" />
          </Col>
        </Row>
      </div>

      {/* 核心价值观 */}
      <div className={styles.section}>
        <Title level={2} className={styles.sectionTitle}>
          核心价值观
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}>
            <ValueCard icon={<RocketOutlined />} title="创新驱动" description="持续创新是我们的核心动力，我们始终走在技术前沿" />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <ValueCard icon={<TeamOutlined />} title="团队协作" description="优秀的团队合作让我们能够完成更具挑战性的项目" />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <ValueCard icon={<StarOutlined />} title="追求卓越" description="我们追求卓越品质，为客户创造最大价值" />
          </Col>
        </Row>
      </div>

      {/* 发展历程 */}
      <div className={styles.section}>
        <Title level={2} className={styles.sectionTitle}>
          发展历程
        </Title>
        <Timeline mode="alternate" className={styles.timeline}>
          <Timeline.Item>2023年 - 技术创新中心成立</Timeline.Item>
          <Timeline.Item>2022年 - 获得行业领先认证</Timeline.Item>
          <Timeline.Item>2021年 - 完成B轮融资</Timeline.Item>
          <Timeline.Item>2020年 - 团队规模突破100人</Timeline.Item>
          <Timeline.Item>2019年 - 公司成立</Timeline.Item>
        </Timeline>
      </div>

      {/* 核心团队 */}
      <div className={styles.section}>
        <Title level={2} className={styles.sectionTitle}>
          核心团队
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}>
            <TeamMember name="张明" role="首席执行官" description="拥有15年技术管理经验，曾领导多个大型项目成功落地" />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <TeamMember name="李华" role="技术总监" description="专注于云计算和人工智能领域，推动公司技术创新" />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <TeamMember name="王芳" role="产品总监" description="深耕产品设计10年，致力于提供极致用户体验" />
          </Col>
        </Row>
      </div>

      {/* 公司文化 */}
      <div className={`${styles.section} ${styles.cultureSection}`}>
        <Title level={2} className={styles.sectionTitle}>
          公司文化
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card className={styles.cultureCard}>
              <Title level={4}>开放包容</Title>
              <Paragraph>我们提倡开放的工作环境，鼓励团队成员表达想法和创意</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className={styles.cultureCard}>
              <Title level={4}>持续学习</Title>
              <Paragraph>为员工提供持续的学习和发展机会，支持职业成长</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className={styles.cultureCard}>
              <Title level={4}>工作生活平衡</Title>
              <Paragraph>重视员工的工作生活平衡，组织丰富的团队活动</Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default About;
