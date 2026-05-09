import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Empty, Space, Typography } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useMemo } from 'react';

import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, BlogDetailView } from '@components/Shared';
import styles from '../style.module.scss';

const { Title, Paragraph } = Typography;

const BlogDetail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset, Page] = remoteModules;
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
    <Page name="blog-detail">
      <Fetch
        {...Object.assign({}, apis.blog.detail, { params: { id: searchParams.get('id') } })}
        render={({ data }) => {
          if (!data) {
            return (
              <div className={styles.detailPage}>
                <div className={styles.noticePanel}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="博客不存在或已被删除" />
                </div>
              </div>
            );
          }

          const isLoggedIn = hasUserToken();

          if (!isLoggedIn && !data.isPublic) {
            return (
              <div className={styles.detailPage}>
                <div className={styles.noticePanel}>
                  <Title level={4}>该文章为私密文章</Title>
                  <Paragraph>请登录后查看完整内容。</Paragraph>
                  <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/account/login')}>
                    去登录
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <BlogDetailView
              data={data}
              headerExtra={<ShareButton type="blog" id={data.id} disabled={data.status !== 'published' || !data.isPublic} disabledReason={!data.isPublic ? '私密文章无法分享' : '未发布文章无法分享'} />}
              footer={
                <div className={styles.detailActions}>
                  <Space>
                    <Button type="primary" ghost icon={<ArrowLeftOutlined />} onClick={() => navigate(baseUrl)}>
                      返回列表
                    </Button>
                  </Space>
                </div>
              }
            />
          );
        }}
      />
    </Page>
  );
});

export default BlogDetail;
