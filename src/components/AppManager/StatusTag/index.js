import { Tag } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const STATUS_COLOR = {
  idle: 'default',
  deploying: 'processing',
  restoring: 'processing',
  running: 'success',
  stopped: 'warning',
  error: 'error'
};

/** 部署/恢复进行中时 DB status 仍是旧值（如 running），以 deployment 为准 */
const getDisplayStatus = ({ status, deployment } = {}) => {
  if (deployment) {
    return deployment.source === 'restore' ? 'restoring' : 'deploying';
  }
  return status || 'idle';
};

const StatusTag = withLocale(({ status, deployment }) => {
  const { formatMessage } = useIntl();
  const key = getDisplayStatus({ status, deployment });
  const color = STATUS_COLOR[key] || 'default';
  const labelId = `appManager.status.${key}`;

  return <Tag color={color}>{formatMessage({ id: labelId, defaultMessage: key })}</Tag>;
});

export default StatusTag;
export { STATUS_COLOR, getDisplayStatus };
