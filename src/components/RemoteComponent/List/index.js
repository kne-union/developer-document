import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Input, Empty, Spin, Typography, Space, Divider } from 'antd';
import { useMemo, useState } from 'react';
import Fetch from '@kne/react-fetch';
import { AppstoreOutlined, CodeOutlined, StarOutlined, TagOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

const GROUP_LABELS = {
  business: '业务',
  common: '通用'
};

const GROUP_COLORS = {
  business: 'blue',
  common: 'green'
};

const ComponentList = ({ list, keyword, selectedGroup, navigate, pathname }) => {
  // 按分组分类组件
  const groupedComponents = useMemo(() => {
    const groups = {};
    (list || []).forEach(component => {
      const group = component.group || 'common';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(component);
    });
    return groups;
  }, [list]);

  const filteredGroups = useMemo(() => {
    if (!selectedGroup) return groupedComponents;
    if (!groupedComponents[selectedGroup]) return {};
    return { [selectedGroup]: groupedComponents[selectedGroup] };
  }, [groupedComponents, selectedGroup]);

  const totalComponents = list?.length || 0;
  const totalGroups = Object.keys(groupedComponents).length;

  if (Object.keys(filteredGroups).length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#999' }}>{keyword || selectedGroup ? '未找到匹配的组件' : '暂无组件'}</span>} />
      </div>
    );
  }

  return (
    <>
      {/* 统计信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          padding: '16px 20px',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <Space size="large">
          <Space size={4}>
            <AppstoreOutlined style={{ color: '#1890ff' }} />
            <Text type="secondary">
              共{' '}
              <Text strong style={{ color: '#1890ff' }}>
                {totalGroups}
              </Text>{' '}
              个分类
            </Text>
          </Space>
          <Divider type="vertical" />
          <Space size={4}>
            <CodeOutlined style={{ color: '#52c41a' }} />
            <Text type="secondary">
              共{' '}
              <Text strong style={{ color: '#52c41a' }}>
                {totalComponents}
              </Text>{' '}
              个组件
            </Text>
          </Space>
        </Space>
        {(keyword || selectedGroup) && (
          <Tag color="blue" style={{ margin: 0 }}>
            {selectedGroup ? `分类: ${GROUP_LABELS[selectedGroup]}` : `搜索: ${keyword}`}
          </Tag>
        )}
      </div>

      {/* 组件列表 */}
      {Object.entries(filteredGroups).map(([group, components]) => (
        <div key={group} style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 16,
              gap: 8
            }}
          >
            <TagOutlined style={{ color: GROUP_COLORS[group] || '#666', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
              {GROUP_LABELS[group] || group}
            </Title>
            <Tag color={GROUP_COLORS[group] || 'default'} style={{ marginLeft: 8 }}>
              {components.length} 个组件
            </Tag>
          </div>
          <Row gutter={[16, 16]}>
            {components.map(component => (
              <Col xs={24} sm={12} md={8} lg={6} xl={6} key={component.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f0f0f0'
                  }}
                  styles={{
                    body: { padding: 16 }
                  }}
                  onClick={() => {
                    navigate(`${pathname}/detail?id=${component.id}`);
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* 标题区域 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12
                    }}
                  >
                    <Title
                      level={5}
                      ellipsis={{ rows: 1 }}
                      style={{
                        margin: 0,
                        flex: 1,
                        color: '#262626'
                      }}
                    >
                      {component.name || component.remote}
                    </Title>
                    <Tag
                      color="blue"
                      style={{
                        marginLeft: 8,
                        flexShrink: 0,
                        borderRadius: 4
                      }}
                    >
                      {component.defaultVersion || 'latest'}
                    </Tag>
                  </div>

                  {/* 描述 */}
                  <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{
                      color: '#8c8c8c',
                      marginBottom: 12,
                      minHeight: 60,
                      lineHeight: 1.6,
                      fontSize: 13
                    }}
                  >
                    {component.description || '暂无描述'}
                  </Paragraph>

                  {/* 底部标签 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 12,
                      borderTop: '1px solid #f5f5f5'
                    }}
                  >
                    <Tag
                      style={{
                        margin: 0,
                        background: '#f5f5f5',
                        border: 'none',
                        color: '#595959',
                        borderRadius: 4
                      }}
                    >
                      {component.remote}
                    </Tag>
                    {component.isPublic !== false && (
                      <Space size={2}>
                        <StarOutlined style={{ color: '#faad14', fontSize: 12 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          公开
                        </Text>
                      </Space>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </>
  );
};

const List = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(({ remoteModules }) => {
  const [Page, usePreset] = remoteModules;
  const { apis } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || '');

  const handleSearch = value => {
    setKeyword(value);
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('keyword', value);
    } else {
      newSearchParams.delete('keyword');
    }
    if (selectedGroup) {
      newSearchParams.set('group', selectedGroup);
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  const handleGroupChange = group => {
    setSelectedGroup(group);
    const newSearchParams = new URLSearchParams(searchParams);
    if (group) {
      newSearchParams.set('group', group);
    } else {
      newSearchParams.delete('group');
    }
    if (keyword) {
      newSearchParams.set('keyword', keyword);
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  return (
    <Page name="components">
      <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
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
              组件库
            </Title>
            <Text
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 16,
                display: 'block',
                marginBottom: 24
              }}
            >
              探索丰富的组件资源，助力快速开发
            </Text>
            <Search placeholder="搜索组件名称、描述..." allowClear enterButton="搜索" size="large" defaultValue={keyword} onSearch={handleSearch} style={{ maxWidth: 600 }} />
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
            <Tag color={!selectedGroup ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleGroupChange('')}>
              全部
            </Tag>
            {Object.entries(GROUP_LABELS).map(([value, label]) => (
              <Tag key={value} color={selectedGroup === value ? GROUP_COLORS[value] : 'default'} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleGroupChange(value)}>
                {label}
              </Tag>
            ))}
          </div>

          <Fetch
            {...Object.assign({}, apis.remoteComponent.publicList, {
              data: { keyword, group: selectedGroup }
            })}
            render={({ data, loading }) => {
              if (loading) {
                return (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '100px 0',
                      background: '#fff',
                      borderRadius: 12
                    }}
                  >
                    <Spin size="large" tip="加载中..." />
                  </div>
                );
              }

              const { pageData: list = [] } = data || {};

              return <ComponentList list={list} keyword={keyword} selectedGroup={selectedGroup} navigate={navigate} pathname={location.pathname} />;
            }}
          />
        </div>
      </div>
    </Page>
  );
});

export default List;
