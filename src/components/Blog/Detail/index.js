import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, Tag, Space, Typography, Button, Divider } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

const { Title, Paragraph } = Typography;

const groupsMap = {
  tech: '技术',
  life: '生活',
  product: '产品',
  design: '设计',
  other: '其他'
};

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
    <Fetch
      {...Object.assign({}, apis.blog.detail, { params: { id: searchParams.get('id') } })}
      render={({ data }) => {
        if (!data) {
          return <div>博客不存在</div>;
        }

        // 检查访问权限
        const isLoggedIn = (() => {
          try {
            const token = localStorage.getItem('X-User-Token');
            return !!token;
          } catch {
            return false;
          }
        })();

        // 如果未登录且博客不公开，不允许查看
        if (!isLoggedIn && !data.isPublic) {
          return (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Title level={3}>该文章为私密文章</Title>
              <Paragraph>请登录后查看</Paragraph>
              <Button type="primary" onClick={() => navigate('/account/login')}>
                去登录
              </Button>
            </div>
          );
        }

        return (
          <Page>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
              <Card>
                <Title level={2} style={{ marginBottom: 16 }}>
                  {data.title}
                </Title>
                <Space size="small" wrap style={{ marginBottom: 16 }}>
                  {data.groups?.map(group => (
                    <Tag key={group} color="blue">
                      {groupsMap[group] || group}
                    </Tag>
                  ))}
                  {data.status === 'published' && <Tag color="success">已发布</Tag>}
                  {!data.isPublic && <Tag color="warning">私密</Tag>}
                </Space>
                <Divider />
                <Space split="|" size="small" style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
                  <span>作者：{data.createdUser?.email || '匿名'}</span>
                  <span>发布时间：{dayjs(data.publishTime || data.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                </Space>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.8,
                    fontSize: 16,
                    color: '#333'
                  }}
                >
                  {data.content}
                </div>
              </Card>
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button onClick={() => navigate(baseUrl)}>返回列表</Button>
              </div>
            </div>
          </Page>
        );
      }}
    />
  );
});

export default BlogDetail;
