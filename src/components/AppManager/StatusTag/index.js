import { Tag } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const STATUS_COLOR = {
  idle: 'default',
  deploying: 'processing',
  running: 'success',
  stopped: 'warning',
  error: 'error'
};

const StatusTag = withLocale(({ status }) => {
  const { formatMessage } = useIntl();
  const key = status || 'idle';
  const color = STATUS_COLOR[key] || 'default';
  const labelId = `appManager.status.${key}`;

  return <Tag color={color}>{formatMessage({ id: labelId, defaultMessage: key })}</Tag>;
});

export default StatusTag;
export { STATUS_COLOR };
