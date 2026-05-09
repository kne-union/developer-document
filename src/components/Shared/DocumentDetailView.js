import { Tag, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MarkdownRender from '@kne/markdown-components-render';
import classNames from 'classnames';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import styles from '@components/Document/style.module.scss';

const { Title } = Typography;

const DocumentDetailView = withLocale(({ data, headerExtra, footer, simple }) => {
  const { formatMessage } = useIntl();

  return (
    <div className={styles.detailPage}>
      <section className={styles.detailHeader}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <FileTextOutlined />
          </span>
          <span className={styles.headerIdentityText}>{formatMessage({ id: 'shared.documentDetail.identityLabel' })}</span>
        </div>
        <div className={styles.headerTitleRow}>
          <Title level={2} className={styles.detailTitle}>
            {data.name}
          </Title>
          {headerExtra}
        </div>
        {!simple && (
          <>
            <div className={styles.tagRow}>
              {data.groups?.map(group => (
                <Tag key={group.id} className={classNames(styles.documentTag)} style={{ margin: 0 }}>
                  {group.name}
                </Tag>
              ))}
              <Tag className={classNames(styles.documentTag, data.status === 'published' ? styles.tagLife : styles.tagProduct)}>
                {data.status === 'published' ? formatMessage({ id: 'common.published' }) : formatMessage({ id: 'common.draft' })}
              </Tag>
              {!data.isPublic && (
                <Tag icon={<LockOutlined />} className={classNames(styles.documentTag, styles.tagPrivate)}>
                  {formatMessage({ id: 'common.private' })}
                </Tag>
              )}
            </div>
            <div className={styles.detailMeta}>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <UserOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.documentDetail.authorLabel' })}</div>
                  <div className={styles.detailMetaValue}>{data.createdUser?.email || formatMessage({ id: 'common.anonymous' })}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <CalendarOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.documentDetail.createdTimeLabel' })}</div>
                  <div className={styles.detailMetaValue}>{dayjs(data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <ClockCircleOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.documentDetail.updateTimeLabel' })}</div>
                  <div className={styles.detailMetaValue}>{dayjs(data.updatedAt || data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>{data.isPublic ? <EyeOutlined /> : <EyeInvisibleOutlined />}</span>
                <div>
                  <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.documentDetail.visibilityLabel' })}</div>
                  <div className={styles.detailMetaValue}>{data.isPublic ? formatMessage({ id: 'common.public' }) : formatMessage({ id: 'common.private' })}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className={styles.detailContent}>
        <div className={styles.detailContentHeader}>
          <FileTextOutlined />
          <span>{formatMessage({ id: 'shared.documentDetail.contentLabel' })}</span>
        </div>
        <div className={styles.detailContentBody}>
          <MarkdownRender>{data.content}</MarkdownRender>
        </div>
      </section>

      {footer}
    </div>
  );
});

export default DocumentDetailView;
