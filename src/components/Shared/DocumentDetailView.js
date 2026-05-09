import { Tag, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MarkdownRender from '@kne/markdown-components-render';
import classNames from 'classnames';
import styles from '@components/Document/style.module.scss';

const { Title } = Typography;

const DocumentDetailView = ({ data, headerExtra, footer, simple }) => {
  return (
    <div className={styles.detailPage}>
      <section className={styles.detailHeader}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIdentityIcon}>
            <FileTextOutlined />
          </span>
          <span className={styles.headerIdentityText}>文档中心</span>
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
              <Tag className={classNames(styles.documentTag, data.status === 'published' ? styles.tagLife : styles.tagProduct)}>{data.status === 'published' ? '已发布' : '草稿'}</Tag>
              {!data.isPublic && (
                <Tag icon={<LockOutlined />} className={classNames(styles.documentTag, styles.tagPrivate)}>
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
                  <div className={styles.detailMetaLabel}>创建时间</div>
                  <div className={styles.detailMetaValue}>{dayjs(data.createdAt).format('YYYY-MM-DD HH:mm')}</div>
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
        <div className={styles.detailContentBody}>
          <MarkdownRender>{data.content}</MarkdownRender>
        </div>
      </section>

      {footer}
    </div>
  );
};

export default DocumentDetailView;
