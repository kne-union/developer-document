import { Space, Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { goAdminListBack } from '@components/Shared/goAdminDetail';
import styles from './header.module.scss';

export const HeaderBack = createWithRemoteLoader({
  modules: ['components-core:Icon']
})(({ remoteModules, baseUrl }) => {
  const [Icon] = remoteModules;
  const navigate = useNavigate();
  const location = useLocation();

  if (!baseUrl) {
    return null;
  }

  const handleBack = () => {
    goAdminListBack({ navigate, location, baseUrl });
  };

  return (
    <span
      className={styles.back}
      role="button"
      tabIndex={0}
      onClick={handleBack}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          handleBack();
        }
      }}
    >
      <Icon type="icon-arrow-thin-left" />
    </span>
  );
});

export const HeaderMeta = ({ id, relativePath, creator, createdAt, writtenAt, updatedAt, formatMessage }) => {
  const dateItems = [
    createdAt ? { key: 'createdAt', label: formatMessage({ id: 'common.createdAt' }), value: createdAt } : null,
    writtenAt && writtenAt !== createdAt ? { key: 'writtenAt', label: formatMessage({ id: 'kneDocumentRecordDetail.writtenAt' }), value: writtenAt } : null,
    updatedAt && updatedAt !== writtenAt && updatedAt !== createdAt ? { key: 'updatedAt', label: formatMessage({ id: 'common.updatedAt' }), value: updatedAt } : null
  ].filter(Boolean);

  return (
    <div className={styles['meta-wrap']}>
      <Space className={styles.meta} size={[16, 2]} wrap>
        {id ? (
          <Typography.Text className={styles['meta-item']} copyable={{ text: String(id) }}>
            ID: {id}
          </Typography.Text>
        ) : null}
        {relativePath ? (
          <Tooltip title={relativePath}>
            <span className={`${styles['meta-item']} ${styles['meta-path']}`}>
              <FileTextOutlined />
              {relativePath}
            </span>
          </Tooltip>
        ) : null}
        {creator ? (
          <span className={styles['meta-item']}>
            <UserOutlined />
            {creator}
          </span>
        ) : null}
        {dateItems.map(item => (
          <span key={item.key} className={styles['meta-item']}>
            <ClockCircleOutlined />
            {item.label}: {item.value}
          </span>
        ))}
      </Space>
    </div>
  );
};

export const HeaderActions = ({ children }) => {
  return <div className={styles.actions}>{children}</div>;
};
