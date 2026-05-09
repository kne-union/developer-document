import React from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Typography, Row, Col, Statistic, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ColorfulCard, defaultColors, Jelly, GlassCard, PersonalCard } from '@kne/react-box';
import Timeline from '@kne/timeline';
import '@kne/timeline/dist/index.css';
import styles from './style.module.scss';
import { IconDisplay } from '@kne/antd-icon-select';
import '@kne/react-box/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const { Title, Paragraph } = Typography;

export const StatisticSection = withLocale(({ data = [] }) => {
  const { formatMessage } = useIntl();
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          {formatMessage({ id: 'about.statisticSectionTitle' })}
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
});

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

export const ValueSection = withLocale(({ data = [] }) => {
  const { formatMessage } = useIntl();
  if (!(data && data.length > 0)) {
    return null;
  }
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          {formatMessage({ id: 'about.coreValuesTitle' })}
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
});

const formatTime = time => {
  if (!time) return '';
  const date = dayjs(time);
  if (!date.isValid()) return time;
  return date.format('YYYY.MM');
};

export const HistorySection = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data = [] }) => {
    const [usePreset] = remoteModules;
    const { staticUrl } = usePreset();
    const { formatMessage } = useIntl();
    if (!(data && data.length > 0)) {
      return null;
    }
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title level={2} className={styles.sectionTitle}>
            {formatMessage({ id: 'about.historyTitle' })}
          </Title>
        </div>
        <div className={styles.timelinePanel}>
          <Timeline
            data={data.map(item => {
              const timelineItem = {
                title: formatTime(item.time),
                content: item.event
              };
              if (item.images && item.images.length > 0) {
                timelineItem.images = item.images.map(id => ({
                  src: `${staticUrl || window.location.origin}/api/v1/static/file-id/${id}`
                }));
              }
              if (item.extra) {
                timelineItem.extra = item.extra;
              }
              return timelineItem;
            })}
          />
        </div>
      </section>
    );
  })
);

export const TeamMemberSection = createWithRemoteLoader({
  modules: ['components-core:Image']
})(
  withLocale(({ remoteModules, data = [] }) => {
    const [Image] = remoteModules;
    const { formatMessage } = useIntl();
    if (!(data && data.length > 0)) {
      return null;
    }
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title level={2} className={styles.sectionTitle}>
            {formatMessage({ id: 'about.coreTeamTitle' })}
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
  })
);

export const CompanyCultureSection = withLocale(({ data = [] }) => {
  const { formatMessage } = useIntl();
  if (!(data && data.length > 0)) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Title level={2} className={styles.sectionTitle}>
          {formatMessage({ id: 'about.companyCultureTitle' })}
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
});

const About = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { setting } = usePreset();
    const about = setting.about || {};
    const profile = setting.profile || {};
    const { formatMessage } = useIntl();

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
            <Title className={styles.heroTitle}>{formatMessage({ id: 'about.heroTitle' }, { name: profile.name || 'KNE UNION' })}</Title>
            <Paragraph className={styles.heroDescription}>{formatMessage({ id: 'about.heroDescription' })}</Paragraph>
          </div>
        </section>

        <StatisticSection data={about.statistic} />
        <ValueSection data={about.coreValues} />
        <HistorySection data={about.history} />
        <TeamMemberSection data={about.coreTeam} />
        <CompanyCultureSection data={about.culture} />
      </div>
    );
  })
);

export default About;
