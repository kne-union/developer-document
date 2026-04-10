import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Tag, Space, Typography, Button, Empty } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, EyeInvisibleOutlined, EyeOutlined, LockOutlined, LoginOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MarkdownRender from '@kne/markdown-components-render';
import classNames from 'classnames';
import { useMemo } from 'react';
import { hasUserToken } from '@components/Shared/auth';
import styles from '../style.module.scss';

const { Title, Paragraph } = Typography;

const DocumentDetail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-thirdparty:CKEditor']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset, Page, CKEditor] = remoteModules;
  const { apis } = usePreset();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 2).join('/');
  }, [propsBaseUrl, location.pathname]);

  return (
    <Page name="document-detail">
      <Fetch
        {...Object.assign({}, apis.document.detail, { params: { id: searchParams.get('id') } })}
        render={({ data }) => {
          if (!data) {
            return (
              <div className={styles.detailPage}>
                <div className={styles.noticePanel}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="文档不存在或已被删除" />
                </div>
              </div>
            );
          }

          const isLoggedIn = hasUserToken();

          if (!isLoggedIn && !data.isPublic) {
            return (
              <div className={styles.detailPage}>
                <div className={styles.noticePanel}>
                  <Title level={4}>该文档为私密文档</Title>
                  <Paragraph>请登录后查看完整内容。</Paragraph>
                  <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/account/login')}>
                    去登录
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div className={styles.detailPage}>
              <section className={styles.detailHeader}>
                <div className={styles.headerIdentity}>
                  <span className={styles.headerIdentityIcon}>
                    <FileTextOutlined />
                  </span>
                  <span className={styles.headerIdentityText}>文档中心</span>
                </div>
                <Title level={2} className={styles.detailTitle}>
                  {data.name}
                </Title>
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

              <div className={styles.detailActions}>
                <Space>
                  <Button type="primary" ghost icon={<ArrowLeftOutlined />} onClick={() => navigate(baseUrl)}>
                    返回列表
                  </Button>
                </Space>
              </div>
            </div>
          );
        }}
      />
    </Page>
  );
});

export default DocumentDetail;
