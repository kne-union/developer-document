import classnames from 'classnames';
import { Flex, Typography } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useIsMobile } from '@kne/responsive-utils';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import StatusTag from '../StatusTag';
import style from './style.module.scss';

const { Text, Paragraph, Title } = Typography;

const display = value => {
  if (value === 0) {
    return '0';
  }
  return value || '-';
};

const FieldRow = ({ label, children, mono }) => (
  <div className={style['field-row']}>
    <Text type="secondary" className={style['field-label']}>
      {label}
    </Text>
    <div className={classnames(style['field-value'], mono && style['mono'])}>{children}</div>
  </div>
);

const Overview = createWithRemoteLoader({
  modules: ['components-core:Image']
})(
  withLocale(({ remoteModules, data }) => {
    const [Image] = remoteModules;
    const { formatMessage } = useIntl();
    const isMobile = useIsMobile();
    const title = data.label || data.name;
    const initial = String(title || '?')
      .trim()
      .charAt(0)
      .toUpperCase();

    return (
      <div className={style['overview']}>
        <section className={classnames(style['hero'], style[`hero-${data.status || 'idle'}`])}>
          <Flex gap={isMobile ? 14 : 20} align="flex-start" className={style['hero-main']}>
            <div className={style['hero-icon']}>{data.icon && Image?.Avatar ? <Image.Avatar id={data.icon} alt={title} size={isMobile ? 64 : 80} shape="square" /> : <div className={style['hero-icon-fallback']}>{initial}</div>}</div>
            <div className={style['hero-body']}>
              <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap">
                <div className={style['hero-titles']}>
                  <Title level={4} className={style['hero-title']}>
                    {title}
                  </Title>
                  <Text type="secondary" className={style['hero-name']}>
                    {data.name}
                  </Text>
                </div>
                <StatusTag status={data.status} />
              </Flex>
              <Paragraph type="secondary" className={style['hero-desc']} ellipsis={{ rows: 2 }}>
                {data.description || formatMessage({ id: 'appManager.list.noDescription' })}
              </Paragraph>
              {data.pathUrl ? (
                <a className={style['open-link']} href={data.pathUrl} target="_blank" rel="noreferrer">
                  <ExportOutlined />
                  <span>{formatMessage({ id: 'appManager.list.openApp' })}</span>
                </a>
              ) : null}
            </div>
          </Flex>

          <div className={style['metrics']}>
            <div className={style['metric']}>
              <Text type="secondary" className={style['metric-label']}>
                {formatMessage({ id: 'appManager.columns.port' })}
              </Text>
              <Text strong className={style['metric-value']}>
                {display(data.port)}
              </Text>
            </div>
            <div className={style['metric']}>
              <Text type="secondary" className={style['metric-label']}>
                {formatMessage({ id: 'appManager.detail.currentVersion' })}
              </Text>
              <Text strong className={classnames(style['metric-value'], style['mono'])} ellipsis={{ tooltip: true }}>
                {display(data.currentVersionId)}
              </Text>
            </div>
            <div className={style['metric']}>
              <Text type="secondary" className={style['metric-label']}>
                {formatMessage({ id: 'appManager.detail.pm2Name' })}
              </Text>
              <Text strong className={classnames(style['metric-value'], style['mono'])} ellipsis={{ tooltip: true }}>
                {display(data.pm2Name)}
              </Text>
            </div>
          </div>

          {data.status === 'deploying' ? (
            <Text type="secondary" className={style['deploying-hint']}>
              {formatMessage({ id: 'appManager.detail.deployingHint' })}
            </Text>
          ) : null}
        </section>

        <section className={style['detail-card']}>
          <div className={style['detail-card-title']}>{formatMessage({ id: 'appManager.detail.sectionMore' })}</div>
          <div className={style['field-list']}>
            <FieldRow label={formatMessage({ id: 'appManager.columns.pathUrl' })}>
              {data.pathUrl ? (
                <a href={data.pathUrl} target="_blank" rel="noreferrer">
                  {data.pathUrl}
                </a>
              ) : (
                '-'
              )}
            </FieldRow>
            <FieldRow label={formatMessage({ id: 'appManager.columns.domain' })}>{display(data.domain)}</FieldRow>
            <FieldRow label={formatMessage({ id: 'appManager.columns.message' })}>{display(data.message)}</FieldRow>
          </div>
        </section>
      </div>
    );
  })
);

export default Overview;
