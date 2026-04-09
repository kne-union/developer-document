import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Tag, Typography, Empty, Pagination, Input, Tree, Space, DatePicker } from 'antd';
import { FileTextOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { hasUserToken } from '@components/Shared/auth';
import styles from '../style.module.scss';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const pageSize = 12;

const DocumentList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Global@useGlobalValue', 'components-admin:UserSelect']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset, Page, useGlobalValue, UserSelect] = remoteModules;
  const { apis } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const locale = useGlobalValue('locale');
  const isLoggedIn = useMemo(() => hasUserToken(), []);
  const selectedGroup = searchParams.get('group');
  const [createdUserId, setCreatedUserId] = useState(null);
  const [createdAtRange, setCreatedAtRange] = useState(null);

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 2).join('/');
  }, [propsBaseUrl, location.pathname]);

  const apiConfig = isLoggedIn ? apis.document.list : apis.document.publicList;

  const syncGroupToSearch = nextGroup => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextGroup) {
      nextSearchParams.set('group', nextGroup);
    } else {
      nextSearchParams.delete('group');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const requestParams = useMemo(() => {
    const params = {
      keyword: keyword,
      current,
      pageSize,
      status: isLoggedIn ? 'published' : undefined,
      createdUserId: createdUserId || undefined
    };

    if (selectedGroup) {
      params.group = selectedGroup;
    }

    if (createdAtRange && createdAtRange[0] && createdAtRange[1]) {
      params.createdAtStart = createdAtRange[0].startOf('day').toISOString();
      params.createdAtEnd = createdAtRange[1].endOf('day').toISOString();
    }

    return params;
  }, [keyword, current, selectedGroup, isLoggedIn, createdUserId, createdAtRange]);

  return (
    <Page name="document" noMargin>
      <div className={styles.page}>
        <section className={`${styles.headerPanel} ${styles.listHeader}`}>
          <div className={styles.headerTop}>
            <div className={styles.titleBlock}>
              <div className={styles['headerIdentity']}>
                <span className={styles['headerIdentityIcon']}>
                  <FileTextOutlined />
                </span>
                <Text className={styles['headerIdentityText']}>知识库</Text>
              </div>
              <Title level={2} className={styles.pageTitle}>
                文档中心
              </Title>
              <Paragraph className={styles.pageDescription}>整理技术文档、项目指南和知识笔记，便于快速检索与持续积累。</Paragraph>
            </div>
            <div className={styles.searchBox}>
              <Search
                allowClear
                enterButton="搜索"
                size="large"
                placeholder="搜索文档名称或关键字"
                value={keyword}
                onChange={event => {
                  const nextValue = event.target.value;
                  setKeyword(nextValue);
                  if (!nextValue) {
                    setCurrent(1);
                  }
                }}
                onSearch={value => {
                  setKeyword(value.trim());
                  setCurrent(1);
                }}
              />
            </div>
          </div>

          <div className={styles.filterRow}>
            <Text className={styles.filterLabel}>筛选：</Text>
            <Space wrap className={styles.filterList} align="center">
              {isLoggedIn && (
                <UserSelect.Field
                  className={styles['user-select']}
                  single
                  allowClear
                  size="small"
                  placeholder="发布用户"
                  style={{ minWidth: 120 }}
                  onChange={item => {
                    setCreatedUserId(item?.id);
                    setCurrent(1);
                  }}
                />
              )}
              <RangePicker
                className={styles['range-picker']}
                size="small"
                placeholder={['创建开始', '创建结束']}
                value={createdAtRange}
                onChange={dates => {
                  setCreatedAtRange(dates);
                  setCurrent(1);
                }}
              />
            </Space>
          </div>
        </section>

        <div className={styles.contentLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <FolderOutlined />
              <Text className={styles.sidebarTitle}>文件夹</Text>
            </div>
            <Fetch
              {...apis.group.groupList}
              params={{ type: 'document', language: locale, output: 'tree' }}
              render={({ data, loading }) => {
                if (loading) {
                  return <div className={styles.sidebarLoading}>加载中...</div>;
                }

                const treeData = [
                  {
                    id: 'root',
                    name: '全部文档',
                    children: data
                  }
                ];

                // 获取所有节点 id 用于默认展开
                const getAllNodeIds = nodes => {
                  const ids = [];
                  nodes.forEach(node => {
                    ids.push(node.id);
                    if (node.children && node.children.length > 0) {
                      ids.push(...getAllNodeIds(node.children));
                    }
                  });
                  return ids;
                };

                return (
                  <Tree
                    showIcon
                    defaultExpandAll
                    selectedKeys={[selectedGroup]}
                    treeData={treeData}
                    titleRender={item => item.name}
                    fieldNames={{ title: 'name', key: 'id', children: 'children' }}
                    onSelect={keys => {
                      const selectedKey = keys[0];
                      setCurrent(1);
                      syncGroupToSearch(selectedKey === 'root' ? null : selectedKey);
                    }}
                    icon={props => {
                      if (props.key === null) return <FileTextOutlined />;
                      return props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />;
                    }}
                    className={styles.folderTree}
                  />
                );
              }}
            />
          </aside>

          <main className={styles.mainContent}>
            <Fetch
              key={`${keyword}-${current}-${selectedGroup}-${createdUserId}-${createdAtRange?.[0]?.valueOf()}-${createdAtRange?.[1]?.valueOf()}`}
              {...Object.assign({}, apiConfig, { params: requestParams })}
              render={({ data, loading }) => {
                const list = data?.list || data?.pageData || [];
                const total = data?.total || data?.totalCount || 0;

                if (loading) {
                  return <div className={styles.emptyState}>加载中...</div>;
                }

                if (list.length === 0) {
                  return (
                    <div className={styles.emptyState}>
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文档" />
                    </div>
                  );
                }

                return (
                  <>
                    <div className={styles.summaryBar}>
                      <div className={styles.summaryItem}>
                        <Text className={styles.summaryLabel}>文档数</Text>
                        <Text className={styles.summaryValue}>{total}</Text>
                      </div>
                      <div className={styles.summaryItem}>
                        <Text className={styles.summaryLabel}>浏览模式</Text>
                        <Text className={styles.summaryValue}>{isLoggedIn ? '登录' : '公开'}</Text>
                      </div>
                    </div>

                    <div className={styles.cardGrid}>
                      {list.map(item => (
                        <button type="button" key={item.id} className={styles.card} onClick={() => navigate(`${baseUrl}/detail?id=${item.id}`)}>
                          <div className={styles.cardHeader}>
                            <Title level={4} ellipsis={{ rows: 2 }} className={styles.cardTitle}>
                              {item.name}
                            </Title>
                          </div>
                          <div className={styles.tagRow}>
                            {item.groups?.slice(0, 3).map(group => (
                              <Tag key={group.id} className={classNames(styles['documentTag'])} style={{ margin: 0 }}>
                                {group.name}
                              </Tag>
                            ))}
                            {!item.isPublic && isLoggedIn && (
                              <Tag className={classNames(styles['documentTag'], styles['tagPrivate'])} style={{ margin: 0 }}>
                                私密
                              </Tag>
                            )}
                          </div>
                          <Paragraph ellipsis={{ rows: 3 }} className={styles.excerpt}>
                            {item.content?.replace(/<[^>]*>/g, '')}
                          </Paragraph>
                          <div className={styles.cardFooter}>
                            <Text className={styles.metaText}>{item.createdUser?.email?.split('@')[0] || '匿名'}</Text>
                            <Text className={styles.metaText}>{dayjs(item.createdAt).format('YYYY-MM-DD')}</Text>
                            <Text className={styles.cardAction}>查看详情</Text>
                          </div>
                        </button>
                      ))}
                    </div>

                    {total > pageSize && (
                      <div className={styles.paginationPanel}>
                        <Pagination
                          current={current}
                          pageSize={pageSize}
                          total={total}
                          onChange={page => {
                            setCurrent(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          showSizeChanger={false}
                          showTotal={value => `共 ${value} 篇文档`}
                        />
                      </div>
                    )}
                  </>
                );
              }}
            />
          </main>
        </div>
      </div>
    </Page>
  );
});

export default DocumentList;
