import React from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Typography, Row, Col, Timeline, Statistic, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { ColorfulCard, defaultColors, Jelly, GlassCard, PersonalCard } from '@kne/react-box';
import styles from './style.module.scss';
import { IconDisplay } from '@kne/antd-icon-select';
import dayjs from 'dayjs';
import '@kne/react-box/dist/index.css';

const { Title, Paragraph } = Typography;

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
        {data.map((item, index) => {
          const color = Object.values(defaultColors)[index];
          return (
            <ColorfulCard icon={<IconDisplay type={item.icon} style={{ color }} />} color={color} title={item.name} className={styles.statCard} key={item.name}>
              <Statistic value={item.value} suffix="+" />
            </ColorfulCard>
          );
        })}
      </div>
    </section>
  );
};

const ValueCard = ({ icon, title, description, color }) => (
  <div className={styles.valueCard}>
    <Jelly className={styles.valueIcon} color={color}>
      {icon}
    </Jelly>
    <Title level={4} className={styles.cardTitle}>
      {title}
    </Title>
    <Paragraph className={styles.cardText}>{description}</Paragraph>
  </div>
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
          const color = Object.values(defaultColors)[index + 3];
          return (
            <Col xs={24} sm={12} lg={8} key={index}>
              <ValueCard icon={<IconDisplay type={item.icon} />} title={item.title} description={item.description} color={color} />
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

export const TeamMemberSection = createWithRemoteLoader({
  modules: ['components-core:Image']
})(({ remoteModules, data = [] }) => {
  const [Image] = remoteModules;
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
              <PersonalCard avatar={({ className }) => <Image.Avatar className={className} size={72} id={item.avatar} />} name={item.name} title={item.role} description={item.description} status="online" mode="vertical" />
            </Col>
          );
        })}
      </Row>
    </section>
  );
});

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
              <GlassCard className={styles.cultureCard} bordered={false}>
                <Title level={4} className={styles.cardTitle}>
                  {item.title}
                </Title>
                <Paragraph className={styles.cardText}>{item.description}</Paragraph>
              </GlassCard>
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
