import { createWithRemoteLoader } from '@kne/remote-loader';
import { Tag, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined, LockOutlined, ReadOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import classNames from 'classnames';
import styles from '@components/Blog/style.module.scss';

const { Title } = Typography;

const BlogDetailView = createWithRemoteLoader({
  modules: ['components-thirdparty:CKEditor']
})(({ remoteModules, data, headerExtra, footer, simple }) => {
  const [CKEditor] = remoteModules;
  const isRichContent = /<\/?[a-z][\s\S]*>/i.test(data.content || '');

  return (
    <div className={styles.detailPage}>
      <section className={styles.detailHeader}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <ReadOutlined />
          </span>
          <span className={styles.headerIdentityText}>博客内容</span>
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
              <Tag className={classNames(styles.blogTag, data.status === 'published' ? styles.tagLife : styles.tagProduct)}>{data.status === 'published' ? '已发布' : '草稿'}</Tag>
              {!data.isPublic && (
                <Tag icon={<LockOutlined />} className={classNames(styles.blogTag, styles.tagPrivate)}>
                  私密
                </Tag>
              )}
            </div>
            <div className={styles.detailMeta}>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <UserOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>作者</div>
                  <div className={styles.detailMetaValue}>{data.createdUser?.email || '匿名'}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <CalendarOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>发布时间</div>
                  <div className={styles.detailMetaValue}>{dayjs(data.publishTime || data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>
                  <ClockCircleOutlined />
                </span>
                <div>
                  <div className={styles.detailMetaLabel}>更新时间</div>
                  <div className={styles.detailMetaValue}>{dayjs(data.updatedAt || data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>{data.isPublic ? <EyeOutlined /> : <EyeInvisibleOutlined />}</span>
                <div>
                  <div className={styles.detailMetaLabel}>可见性</div>
                  <div className={styles.detailMetaValue}>{data.isPublic ? '公开' : '私密'}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className={styles.detailContent}>
        <div className={styles.detailContentHeader}>
          <FileTextOutlined />
          <span>正文内容</span>
        </div>
        <div className={styles.detailContentBody}>{isRichContent ? <CKEditor.Content>{data.content}</CKEditor.Content> : <div className={styles.articleContent}>{data.content}</div>}</div>
      </section>

      {footer}
    </div>
  );
});

export default BlogDetailView;
