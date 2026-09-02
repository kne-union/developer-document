import { Space, Tag } from 'antd';
import dayjs from 'dayjs';
import styles from './style.module.scss';

export const formatDateTime = value => {
  if (!value) {
    return null;
  }
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : String(value);
};

export const hasValue = value => {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
};

export const contentField = (label, content, options = {}) => {
  if (!hasValue(content)) {
    return null;
  }
  return { label, content, ...options };
};

export const toContentList = items => items.filter(Boolean);

export const prose = value => <div className={styles.prose}>{value}</div>;

export const link = url => (
  <a href={url} target="_blank" rel="noreferrer">
    {url}
  </a>
);

export const bulletList = items => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <ul className={styles.list}>
      {items.map((item, index) => (
        <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
  );
};

export const tagList = items => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <Space size={[6, 6]} wrap>
      {items.map(item => (
        <Tag key={item}>{item}</Tag>
      ))}
    </Space>
  );
};

export const codeBlock = (code, title, why) => {
  if (!hasValue(code) && !hasValue(why) && !hasValue(title)) {
    return null;
  }
  return (
    <div className={styles['code-wrap']}>
      {title ? <div className={styles['code-title']}>{title}</div> : null}
      {hasValue(why) ? <div className={styles.muted}>{why}</div> : null}
      {hasValue(code) ? <pre className={styles.code}>{code}</pre> : null}
    </div>
  );
};

export const recordList = items => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <ul className={styles.records}>
      {items.map((item, index) => (
        <li key={index} className={styles['record-item']}>
          <div className={styles['record-title']}>{item.title}</div>
          {item.meta ? <div className={styles.muted}>{item.meta}</div> : null}
        </li>
      ))}
    </ul>
  );
};

export const proposalStatusColor = status => {
  if (status === 'accepted') {
    return 'success';
  }
  if (status === 'rejected') {
    return 'error';
  }
  if (status === 'superseded') {
    return 'default';
  }
  return 'processing';
};

export const proposalFlowStatus = status => {
  if (status === 'accepted') {
    return 'finish';
  }
  if (status === 'rejected') {
    return 'error';
  }
  if (status === 'superseded') {
    return 'wait';
  }
  return 'process';
};
