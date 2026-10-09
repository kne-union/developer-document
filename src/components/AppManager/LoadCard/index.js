import { useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Button, Flex, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import buildAuthUrl from '../utils/buildAuthUrl';
import Sparkline from './Sparkline';
import style from './style.module.scss';

const { Text } = Typography;

const MIN_POINTS = 120;
const PM2_STATUS_COLOR = { online: 'success', launching: 'processing', stopping: 'warning', stopped: 'default', errored: 'error', offline: 'default' };

const isNumber = value => typeof value === 'number' && Number.isFinite(value);

const formatBytes = value => {
  if (!isNumber(value)) {
    return '-';
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(0)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDuration = ms => {
  if (!isNumber(ms) || ms <= 0) {
    return '-';
  }
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) {
    return `${days}d ${hours}h`;
  }
  if (hours) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const formatMs = value => {
  if (!isNumber(value)) {
    return '-';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value} ms`;
};

const formatRate = value => (isNumber(value) ? `${(value * 100).toFixed(2)}%` : '-');

const formatNumber = value => (isNumber(value) ? String(value) : '-');

const MetricTile = ({ label, value, trend, tone, children }) => (
  <div className={classnames(style['tile'], tone && style[`tone-${tone}`])}>
    <Text type="secondary" className={style['tile-label']}>
      {label}
    </Text>
    <div className={style['tile-value']}>{value}</div>
    {children}
    {trend ? <Sparkline values={trend} className={style['tile-trend']} /> : null}
  </div>
);

const LoadCard = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data }) => {
    const [usePreset] = remoteModules;
    const { apis, staticUrl } = usePreset();
    const { formatMessage } = useIntl();
    const [samples, setSamples] = useState([]);
    const [intervalMs, setIntervalMs] = useState(null);
    const [connection, setConnection] = useState('connecting');
    const [reconnectKey, setReconnectKey] = useState(0);
    const capacityRef = useRef(MIN_POINTS);
    const appName = data?.name;

    const streamUrl = useMemo(() => (appName ? buildAuthUrl(staticUrl, apis.appManager.loadStream.url, { name: appName }) : null), [apis.appManager.loadStream.url, appName, staticUrl]);

    useEffect(() => {
      if (!streamUrl) {
        return undefined;
      }
      setConnection('connecting');
      const source = new EventSource(streamUrl);
      const onHistory = event => {
        try {
          const payload = JSON.parse(event.data);
          const pageData = payload.pageData || [];
          capacityRef.current = Math.max(MIN_POINTS, pageData.length);
          setIntervalMs(payload.intervalMs);
          setSamples(pageData);
        } catch (e) {
          // ignore malformed
        }
      };
      const onLoad = event => {
        try {
          const sample = JSON.parse(event.data);
          setSamples(prev => [...prev, sample].slice(-capacityRef.current));
        } catch (e) {
          // ignore malformed
        }
      };
      source.addEventListener('history', onHistory);
      source.addEventListener('load', onLoad);
      source.onopen = () => setConnection('connected');
      source.onerror = () => {
        setConnection('disconnected');
        source.close();
      };
      return () => {
        source.removeEventListener('history', onHistory);
        source.removeEventListener('load', onLoad);
        source.close();
      };
    }, [streamUrl, reconnectKey]);

    const current = samples.length ? samples[samples.length - 1] : null;
    const requests = current?.requests || {};
    const online = current?.status === 'online';
    const trends = useMemo(
      () => ({
        cpu: samples.map(item => (item.status === 'online' ? item.cpu : null)),
        memory: samples.map(item => (item.status === 'online' ? item.memory : null)),
        qps: samples.map(item => item.requests?.qps ?? null),
        p95: samples.map(item => item.requests?.p95 ?? null)
      }),
      [samples]
    );

    const statusText = status => formatMessage({ id: `appManager.load.pm2Status.${status}`, defaultMessage: status });
    const processValue = (value, formatter) => (online ? formatter(value) : '-');

    let body;
    if (intervalMs === 0) {
      body = <Text type="secondary">{formatMessage({ id: 'appManager.load.disabled' })}</Text>;
    } else if (!current) {
      body = <Text type="secondary">{formatMessage({ id: connection === 'disconnected' ? 'appManager.load.disconnectedHint' : 'appManager.load.empty' })}</Text>;
    } else {
      body = (
        <>
          <div className={style['section-title']}>{formatMessage({ id: 'appManager.load.processSection' })}</div>
          {!online ? (
            <Text type="secondary" className={style['offline-hint']}>
              {formatMessage({ id: 'appManager.load.offline' })}
            </Text>
          ) : null}
          <div className={style['tiles']}>
            <MetricTile label={formatMessage({ id: 'appManager.load.status' })} value={<Tag color={PM2_STATUS_COLOR[current.status] || 'default'}>{statusText(current.status)}</Tag>}>
              {online && current.instances > 1 ? (
                <Text type="secondary" className={style['tile-extra']}>
                  {formatMessage({ id: 'appManager.load.instances' }, { count: current.instances })}
                </Text>
              ) : null}
            </MetricTile>
            <MetricTile label={formatMessage({ id: 'appManager.load.cpu' })} value={processValue(current.cpu, value => `${value}%`)} trend={trends.cpu} tone="blue" />
            <MetricTile label={formatMessage({ id: 'appManager.load.memory' })} value={processValue(current.memory, formatBytes)} trend={trends.memory} tone="purple" />
            <MetricTile label={formatMessage({ id: 'appManager.load.uptime' })} value={processValue(current.uptime, formatDuration)} />
            <MetricTile label={formatMessage({ id: 'appManager.load.restarts' })} value={processValue(current.restarts, formatNumber)} />
          </div>

          <div className={style['section-title']}>{formatMessage({ id: 'appManager.load.requestSection' })}</div>
          <div className={style['tiles']}>
            <MetricTile label={formatMessage({ id: 'appManager.load.qps' })} value={formatNumber(requests.qps)} trend={trends.qps} tone="green" />
            <MetricTile label={formatMessage({ id: 'appManager.load.rpm' })} value={formatNumber(requests.rpm)} />
            <MetricTile label={formatMessage({ id: 'appManager.load.avgRt' })} value={formatMs(requests.avgRt)} />
            <MetricTile label={formatMessage({ id: 'appManager.load.p95' })} value={formatMs(requests.p95)} trend={trends.p95} tone="orange" />
            <MetricTile label={formatMessage({ id: 'appManager.load.p99' })} value={formatMs(requests.p99)} />
            <MetricTile label={formatMessage({ id: 'appManager.load.errorRate' })} value={formatRate(requests.errorRate)} tone={requests.errorRate > 0 ? 'red' : undefined} />
            <MetricTile label={formatMessage({ id: 'appManager.load.upstreamErrors' })} value={formatNumber(requests.upstreamErrors)} tone={requests.upstreamErrors > 0 ? 'red' : undefined} />
            <MetricTile label={formatMessage({ id: 'appManager.load.concurrency' })} value={`${formatNumber(requests.concurrency)} / ${formatNumber(requests.peakConcurrency)}`} />
          </div>
          <Text type="secondary" className={style['scope-hint']}>
            {formatMessage({ id: 'appManager.load.scopeHint' })}
          </Text>
        </>
      );
    }

    return (
      <section className={style['load-card']}>
        <Flex className={style['header']} align="center" justify="space-between" gap={8} wrap="wrap">
          <div className={style['title']}>{formatMessage({ id: 'appManager.load.title' })}</div>
          <Flex align="center" gap={8} wrap="wrap">
            {current?.sampledAt ? (
              <Text type="secondary" className={style['updated']}>
                {formatMessage({ id: 'appManager.load.updatedAt' }, { time: String(current.sampledAt).slice(11, 19) })}
              </Text>
            ) : null}
            <Tag className={style['conn-tag']} color={connection === 'connected' ? 'success' : connection === 'connecting' ? 'processing' : 'default'}>
              {formatMessage({ id: `appManager.load.${connection}` })}
            </Tag>
            {connection === 'disconnected' ? (
              <Button size="small" icon={<ReloadOutlined />} onClick={() => setReconnectKey(key => key + 1)}>
                {formatMessage({ id: 'appManager.load.reconnect' })}
              </Button>
            ) : null}
          </Flex>
        </Flex>
        {body}
      </section>
    );
  })
);

export default LoadCard;
