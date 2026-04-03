import React from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Typography, Row, Col, Card, Timeline, Statistic, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import styles from './style.module.scss';
import { IconDisplay } from '@kne/antd-icon-select';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

const TeamMember = createWithRemoteLoader({
  modules: ['components-core:Image']
})(({ remoteModules, avatar, name, role, description }) => {
  const [Image] = remoteModules;
  return (
    <Card className={styles.teamCard} bordered={false}>
      <div className={styles.memberAvatar}>
        <Image.Avatar size={88} id={avatar} />
      </div>
      <Title level={4} className={styles.cardTitle}>
        {name}
      </Title>
      <Text className={styles.cardSubTitle}>{role}</Text>
      <Paragraph className={styles.cardText}>{description}</Paragraph>
    </Card>
  );
});

export const StatisticSection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          数据概览
        </Title>
      </div>
      <div className={styles.statsGrid}>
        {data.map(item => {
          return (
            <div className={styles.statCard} key={item.name}>
              <div className={styles.statIcon}>
                <IconDisplay type={item.icon} />
              </div>
              <Statistic title={item.name} value={item.value} suffix="+" />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ValueCard = ({ icon, title, description }) => (
  <Card className={styles.valueCard} bordered={false}>
    <div className={styles.valueIcon}>{icon}</div>
    <Title level={4} className={styles.cardTitle}>
      {title}
    </Title>
    <Paragraph className={styles.cardText}>{description}</Paragraph>
  </Card>
);

export const ValueSection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          核心价值观
        </Title>
      </div>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} sm={12} lg={8} key={index}>
              <ValueCard icon={<IconDisplay type={item.icon} />} title={item.title} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </section>
  );
};

export const HistorySection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          发展历程
        </Title>
      </div>
      <div className={styles.timelinePanel}>
        <Timeline
          mode="left"
          items={data.map(item => {
            return {
              label: dayjs(item.time).format('YYYY.MM.DD'),
              children: <span className={styles.timelineText}>{item.event}</span>
            };
          })}
        />
      </div>
    </section>
  );
};

export const TeamMemberSection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          核心团队
        </Title>
      </div>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TeamMember avatar={item.avatar} name={item.name} role={item.role} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </section>
  );
};

export const CompanyCultureSection = ({ data = [] }) => {
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          公司文化
        </Title>
      </div>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} md={8} key={index}>
              <Card className={styles.cultureCard} bordered={false}>
                <Title level={4} className={styles.cardTitle}>
                  {item.title}
                </Title>
                <Paragraph className={styles.cardText}>{item.description}</Paragraph>
              </Card>
            </Col>
          );
        })}
      </Row>
    </section>
  );
};

const About = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { setting } = usePreset();
  const about = setting.about || {};
  const profile = setting.profile || {};

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <Tag bordered={false} className={styles.heroTag}>
            <span className={styles.heroTagIcon}>
              <TeamOutlined />
            </span>
            About
          </Tag>
          <Title className={styles.heroTitle}>关于 {profile.name || 'KNE UNION'}</Title>
          <Paragraph className={styles.heroDescription}>围绕组件体系、远程模块与文档资源持续沉淀统一能力，帮助团队在长期交付中保持一致的开发体验与信息结构。</Paragraph>
        </div>
      </section>

      <StatisticSection data={about.statistic} />
      <ValueSection data={about.coreValues} />
      <HistorySection data={about.history} />
      <TeamMemberSection data={about.coreTeam} />
      <CompanyCultureSection data={about.culture} />
    </div>
  );
});

export default About;
