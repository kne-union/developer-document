import React from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Typography, Row, Col, Card, Timeline, Statistic } from 'antd';
import styles from './style.module.scss';
import { IconDisplay } from '@kne/antd-icon-select';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

const TeamMember = createWithRemoteLoader({
  modules: ['components-core:Image']
})(({ remoteModules, avatar, name, role, description }) => {
  const [Image] = remoteModules;
  return (
    <Card className={styles.teamCard}>
      <div className={styles.memberAvatar}>
        <Image.Avatar size={100} id={avatar} />
      </div>
      <Title level={4}>{name}</Title>
      <Title level={5} type="secondary">
        {role}
      </Title>
      <Paragraph>{description}</Paragraph>
    </Card>
  );
});

export const StatisticSection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <div className={styles.statsSection}>
      <Row gutter={[32, 32]} justify="center">
        {data.map(item => {
          return (
            <Col xs={12} sm={6} key={item.name}>
              <Statistic title={item.name} value={item.value} prefix={<IconDisplay type={item.icon} />} suffix="+" />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

const ValueCard = ({ icon, title, description }) => (
  <Card className={styles.valueCard}>
    <div className={styles.valueIcon}>{icon}</div>
    <Title level={4}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

export const ValueSection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <div className={styles.section}>
      <Title level={2} className={styles.sectionTitle}>
        核心价值观
      </Title>
      <Row gutter={[24, 24]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} sm={12} lg={8} key={index}>
              <ValueCard icon={<IconDisplay type={item.icon} />} title={item.title} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export const HistorySection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <div className={styles.section}>
      <Title level={2} className={styles.sectionTitle}>
        发展历程
      </Title>
      <Timeline
        mode="left"
        className={styles.timeline}
        items={data.map(item => {
          return {
            label: dayjs(item.time).format('YYYY年MM月DD日'),
            children: item.event
          };
        })}
      />
    </div>
  );
};

export const TeamMemberSection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <div className={styles.section}>
      <Title level={2} className={styles.sectionTitle}>
        核心团队
      </Title>
      <Row gutter={[24, 24]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} sm={12} lg={8} key={index}>
              <TeamMember avatar={item.avatar} name={item.name} role={item.role} description={item.description} />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export const CompanyCultureSection = ({ data }) => {
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Title level={2} className={styles.sectionTitle}>
        公司文化
      </Title>
      <Row gutter={[24, 24]}>
        {data.map((item, index) => {
          return (
            <Col xs={24} md={8} key={index}>
              <Card className={styles.cultureCard}>
                <Title level={4}>{item.title}</Title>
                <Paragraph>{item.description}</Paragraph>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

const About = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [usePreset] = remoteModules;
  const { setting } = usePreset();
  const data = setting['about'];
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
      <StatisticSection data={data.statistic} />
      {/* 核心价值观 */}
      <ValueSection data={data.coreValues} />
      {/* 发展历程 */}
      <HistorySection data={data.history} />
      {/* 核心团队 */}
      <TeamMemberSection data={data.coreTeam} />
      {/* 公司文化 */}

      <div className={styles.cultureSection}>
        <CompanyCultureSection data={data.culture} />
      </div>
    </div>
  );
});

export default About;
