import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Card, Tag, Space, Typography, Empty, Pagination, Input, Spin, Row, Col, Menu } from 'antd';
import { ReadOutlined, CodeOutlined, HeartOutlined, AppstoreOutlined, BgColorsOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const groupsMap = {
  all: { label: '全部', icon: ReadOutlined },
  tech: { label: '技术', icon: CodeOutlined },
  life: { label: '生活', icon: HeartOutlined },
  product: { label: '产品', icon: AppstoreOutlined },
  design: { label: '设计', icon: BgColorsOutlined },
  other: { label: '其他', icon: FileTextOutlined }
};

const groupKeys = Object.keys(groupsMap);

const BlogList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset] = remoteModules;
  const { apis } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const pageSize = 10;

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 2).join('/');
  }, [propsBaseUrl, location.pathname]);

  // 检查用户是否登录
  const isLoggedIn = useMemo(() => {
    try {
      const token = localStorage.getItem('X-User-Token');
      return !!token;
    } catch {
      return false;
    }
  }, []);

  // 根据登录状态选择 API
  const apiConfig = isLoggedIn ? apis.blog.list : apis.blog.publicList;

  // 构建请求参数
  const requestParams = useMemo(() => {
    const params = {
      title: keyword || undefined,
      current,
      pageSize,
      status: isLoggedIn ? 'published' : undefined
    };

    if (selectedGroup !== 'all') {
      params.groups = [selectedGroup];
    }

    return params;
  }, [keyword, current, selectedGroup, isLoggedIn]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 头部区域 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '48px 24px',
          marginBottom: 0
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <Title level={1} style={{ color: '#fff', marginBottom: 16, fontWeight: 600 }}>
            博客
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, display: 'block', marginBottom: 24 }}>{isLoggedIn ? '探索精彩内容，发现更多可能' : '分享知识与见解，记录成长点滴'}</Text>
          <Search
            placeholder="搜索博客文章..."
            allowClear
            enterButton="搜索"
            size="large"
            style={{ maxWidth: 600 }}
            onSearch={value => {
              setKeyword(value);
              setCurrent(1);
            }}
          />
        </div>
      </div>

      {/* 分组导航 */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 24,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[selectedGroup]}
            onClick={({ key }) => {
              setSelectedGroup(key);
              setCurrent(1);
            }}
            style={{ border: 'none' }}
            items={groupKeys.map(key => {
              const IconComponent = groupsMap[key].icon;
              return {
                key,
                label: (
                  <span>
                    <IconComponent style={{ marginRight: 8 }} />
                    {groupsMap[key].label}
                  </span>
                )
              };
            })}
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 48px' }}>
        <Fetch
          {...Object.assign({}, apiConfig, { params: requestParams })}
          render={({ data, loading }) => {
            if (loading) {
              return (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <Spin size="large" tip="加载中..." />
                </div>
              );
            }

            const list = data?.list || data?.pageData || [];
            const total = data?.total || data?.totalCount || 0;

            if (list.length === 0) {
              return (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '80px 0',
                    background: '#fff',
                    borderRadius: 8
                  }}
                >
                  <Empty description="暂无博客文章" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              );
            }

            return (
              <>
                {/* 统计信息 */}
                <div style={{ marginBottom: 16, color: '#666' }}>
                  <Text>
                    共找到 <Text strong>{total}</Text> 篇文章
                    {selectedGroup !== 'all' && (
                      <Tag color="purple" style={{ marginLeft: 8 }}>
                        {groupsMap[selectedGroup].label}
                      </Tag>
                    )}
                  </Text>
                </div>

                {/* 博客列表 */}
                <Row gutter={[16, 16]}>
                  {list.map(item => (
                    <Col xs={24} md={12} lg={8} key={item.id}>
                      <Card
                        hoverable
                        style={{
                          height: '100%',
                          borderRadius: 8,
                          overflow: 'hidden',
                          transition: 'all 0.3s'
                        }}
                        bodyStyle={{ padding: 20 }}
                        onClick={() => navigate(`${baseUrl}/detail?id=${item.id}`)}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <Title
                            level={4}
                            ellipsis={{ rows: 2 }}
                            style={{
                              marginBottom: 8,
                              minHeight: 44,
                              color: '#262626'
                            }}
                          >
                            {item.title}
                          </Title>

                          {/* 标签组 */}
                          <Space size={[4, 8]} wrap>
                            {item.groups?.slice(0, 2).map(group => (
                              <Tag
                                key={group}
                                color="blue"
                                style={{
                                  margin: 0,
                                  borderRadius: 4,
                                  fontSize: 12
                                }}
                              >
                                {groupsMap[group]?.label || group}
                              </Tag>
                            ))}
                            {!item.isPublic && isLoggedIn && (
                              <Tag
                                color="orange"
                                style={{
                                  margin: 0,
                                  borderRadius: 4,
                                  fontSize: 12
                                }}
                              >
                                私密
                              </Tag>
                            )}
                          </Space>
                        </div>

                        {/* 内容摘要 */}
                        <Paragraph
                          ellipsis={{ rows: 3 }}
                          style={{
                            color: '#595959',
                            marginBottom: 16,
                            minHeight: 66,
                            lineHeight: 1.6
                          }}
                        >
                          {item.content}
                        </Paragraph>

                        {/* 底部信息 */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 12,
                            borderTop: '1px solid #f0f0f0'
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.createdUser?.email?.split('@')[0] || '匿名'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.publishTime || item.createdAt).format('YYYY-MM-DD')}
                          </Text>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                {/* 分页 */}
                {total > pageSize && (
                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: 40,
                      background: '#fff',
                      padding: '24px',
                      borderRadius: 8
                    }}
                  >
                    <Pagination
                      current={current}
                      pageSize={pageSize}
                      total={total}
                      onChange={page => {
                        setCurrent(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      showSizeChanger={false}
                      showTotal={total => `共 ${total} 篇文章`}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                )}
              </>
            );
          }}
        />
      </div>
    </div>
  );
});

export default BlogList;
