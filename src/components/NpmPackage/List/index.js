import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Input, Empty, Spin, Typography, Space, Divider, Radio } from 'antd';
import { useMemo, useState } from 'react';
import Fetch from '@kne/react-fetch';
import { AppstoreOutlined, CodeOutlined, RocketOutlined, StarOutlined, TagOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

const TYPE_ORDER = ['frontend', 'nodejs', 'engineering', 'miniprogram', 'prompts', 'other'];

const TYPE_LABELS = {
  frontend: '前端组件',
  nodejs: 'NodeJS',
  engineering: '工程化',
  miniprogram: '小程序',
  prompts: 'Prompts',
  other: '其他'
};

const TYPE_COLORS = {
  frontend: 'blue',
  nodejs: 'green',
  engineering: 'orange',
  miniprogram: 'cyan',
  prompts: 'purple',
  other: 'default'
};

const ComponentList = ({ list, keyword, selectedType, navigate, pathname }) => {
  const groupedComponents = useMemo(() => {
    const groups = {};
    (list || []).forEach(component => {
      const type = component.type || '其他';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(component);
    });
    return groups;
  }, [list]);

  const filteredGroups = useMemo(() => {
    if (!selectedType) return groupedComponents;
    if (!groupedComponents[selectedType]) return {};
    return { [selectedType]: groupedComponents[selectedType] };
  }, [groupedComponents, selectedType]);

  const sortedGroupEntries = useMemo(() => {
    const entries = Object.entries(filteredGroups);
    entries.sort((a, b) => {
      const indexA = TYPE_ORDER.indexOf(a[0]);
      const indexB = TYPE_ORDER.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return entries;
  }, [filteredGroups]);

  const totalComponents = list?.length || 0;
  const totalTypes = Object.keys(groupedComponents).length;

  if (sortedGroupEntries.length === 0) {
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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#999' }}>{keyword || selectedType ? '未找到匹配的组件' : '暂无组件'}</span>} />
      </div>
    );
  }

  return (
    <>
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
                {totalTypes}
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
        {(keyword || selectedType) && (
          <Tag color="blue" style={{ margin: 0 }}>
            {selectedType ? `类型: ${selectedType}` : `搜索: ${keyword}`}
          </Tag>
        )}
      </div>

      {sortedGroupEntries.map(([type, components]) => (
        <div key={type} style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 16,
              gap: 8
            }}
          >
            <TagOutlined style={{ color: TYPE_COLORS[type] || '#666', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
              {TYPE_LABELS[type] || type}
            </Title>
            <Tag color={TYPE_COLORS[type] || 'default'} style={{ marginLeft: 8 }}>
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
                      {component.name || component.packageName}
                    </Title>
                    <Tag
                      color={TYPE_COLORS[component.type] || 'default'}
                      style={{
                        marginLeft: 8,
                        flexShrink: 0,
                        borderRadius: 4
                      }}
                    >
                      {component.latestVersion || '-'}
                    </Tag>
                  </div>

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
                      {component.packageName}
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
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');

  const handleSearch = value => {
    setKeyword(value);
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('keyword', value);
    } else {
      newSearchParams.delete('keyword');
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  const handleTypeChange = e => {
    const type = e.target.value;
    setSelectedType(type);
    const newSearchParams = new URLSearchParams(searchParams);
    if (type) {
      newSearchParams.set('type', type);
    } else {
      newSearchParams.delete('type');
    }
    if (keyword) {
      newSearchParams.set('keyword', keyword);
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Radio.Group value={selectedType} onChange={handleTypeChange} buttonStyle="solid">
            <Radio.Button value="">全部</Radio.Button>
            {TYPE_ORDER.map(type => (
              <Radio.Button key={type} value={type}>
                {TYPE_LABELS[type]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        <Fetch
          {...Object.assign({}, apis.npmPackage.publicList, {
            data: { keyword, type: selectedType }
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

            return <ComponentList list={list} keyword={keyword} selectedType={selectedType} navigate={navigate} pathname={location.pathname} />;
          }}
        />
      </div>
    </div>
  );
});

export default List;
