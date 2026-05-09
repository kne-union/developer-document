import { createWithRemoteLoader } from '@kne/remote-loader';
import { Tag, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined, LockOutlined, ReadOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import classNames from 'classnames';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import styles from '@components/Blog/style.module.scss';

const { Title } = Typography;

const BlogDetailView = createWithRemoteLoader({
  modules: ['components-thirdparty:CKEditor']
})(
  withLocale(({ remoteModules, data, headerExtra, footer, simple }) => {
    const [CKEditor] = remoteModules;
    const { formatMessage } = useIntl();
    const isRichContent = /<\/?[a-z][\s\S]*>/i.test(data.content || '');

    return (
      <div className={styles.detailPage}>
        <section className={styles.detailHeader}>
          <div className={styles.headerIdentity}>
            <span className={styles.headerIdentityIcon}>
              <ReadOutlined />
            </span>
            <span className={styles.headerIdentityText}>{formatMessage({ id: 'shared.blogDetail.identityLabel' })}</span>
          </div>
          <div className={styles.headerTitleRow}>
            <Title level={2} className={styles.detailTitle}>
              {data.title}
            </Title>
            {headerExtra}
          </div>
          {!simple && (
            <>
              <div className={styles.tagRow}>
                {data.groups?.map(group => (
                  <Tag key={group.id} className={classNames(styles.blogTag)} style={{ margin: 0 }}>
                    {group.name}
                  </Tag>
                ))}
                <Tag className={classNames(styles.blogTag, data.status === 'published' ? styles.tagLife : styles.tagProduct)}>
                  {data.status === 'published' ? formatMessage({ id: 'common.published' }) : formatMessage({ id: 'common.draft' })}
                </Tag>
                {!data.isPublic && (
                  <Tag icon={<LockOutlined />} className={classNames(styles.blogTag, styles.tagPrivate)}>
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
                    <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.blogDetail.authorLabel' })}</div>
                    <div className={styles.detailMetaValue}>{data.createdUser?.email || formatMessage({ id: 'common.anonymous' })}</div>
                  </div>
                </div>
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaIcon}>
                    <CalendarOutlined />
                  </span>
                  <div>
                    <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.blogDetail.publishTimeLabel' })}</div>
                    <div className={styles.detailMetaValue}>{dayjs(data.publishTime || data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                  </div>
                </div>
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaIcon}>
                    <ClockCircleOutlined />
                  </span>
                  <div>
                    <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.blogDetail.updateTimeLabel' })}</div>
                    <div className={styles.detailMetaValue}>{dayjs(data.updatedAt || data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                  </div>
                </div>
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaIcon}>{data.isPublic ? <EyeOutlined /> : <EyeInvisibleOutlined />}</span>
                  <div>
                    <div className={styles.detailMetaLabel}>{formatMessage({ id: 'shared.blogDetail.visibilityLabel' })}</div>
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
            <span>{formatMessage({ id: 'shared.blogDetail.contentLabel' })}</span>
          </div>
          <div className={styles.detailContentBody}>{isRichContent ? <CKEditor.Content>{data.content}</CKEditor.Content> : <div className={styles.articleContent}>{data.content}</div>}</div>
        </section>

        {footer}
      </div>
    );
  })
);

export default BlogDetailView;
