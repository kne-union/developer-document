import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Tag, Typography, Empty, Pagination, Input, Button, Space, DatePicker, Select } from 'antd';
import { ReadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { hasUserToken } from '@components/Shared/auth';
import styles from '../style.module.scss';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const pageSize = 12;

const BlogList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-admin:UserSelect']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset, Page, UserSelect] = remoteModules;
  const { apis, ajax } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || null);
  const [createdUserId, setCreatedUserId] = useState(null);
  const [publishTimeRange, setPublishTimeRange] = useState(null);
  const [userList, setUserList] = useState([]);

  const isLoggedIn = useMemo(() => hasUserToken(), []);

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 2).join('/');
  }, [propsBaseUrl, location.pathname]);

  const apiConfig = isLoggedIn ? apis.blog.list : apis.blog.publicList;

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
      keyword: keyword || undefined,
      currentPage: current,
      perPage: pageSize,
      status: isLoggedIn ? 'published' : undefined,
      createdUserId: createdUserId || undefined
    };

    if (selectedGroup) {
      params.groups = [selectedGroup];
    }

    if (publishTimeRange && publishTimeRange[0] && publishTimeRange[1]) {
      params.publishTimeStart = publishTimeRange[0].startOf('day').toISOString();
      params.publishTimeEnd = publishTimeRange[1].endOf('day').toISOString();
    }

    return params;
  }, [keyword, current, selectedGroup, isLoggedIn, createdUserId, publishTimeRange]);

  return (
    <Page name="blog" noMargin>
      <div className={styles.page}>
        <section className={`${styles.headerPanel} ${styles.listHeader}`}>
          <div className={styles.headerTop}>
            <div className={styles.titleBlock}>
              <div className={styles['headerIdentity']}>
                <span className={styles['headerIdentityIcon']}>
                  <ReadOutlined />
                </span>
                <Text className={styles['headerIdentityText']}>内容策展</Text>
              </div>
              <Title level={2} className={styles.pageTitle}>
                博客内容
              </Title>
              <Paragraph className={styles.pageDescription}>聚合技术、设计、产品与生活内容，保持简洁结构与较高信息密度，便于持续浏览与检索。</Paragraph>
            </div>
            <div className={styles.searchBox}>
              <Search
                allowClear
                enterButton="搜索"
                size="large"
                placeholder="搜索文章标题或关键字"
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
            <Text className={styles.filterLabel}>分类：</Text>
            <Fetch
              {...apis.group.groupList}
              params={{ type: 'blog', output: 'list' }}
              render={({ data, loading }) => {
                if (loading) {
                  return <Text className={styles.filterLabel}>加载中...</Text>;
                }

                const flatGroups = data || [];

                return (
                  <Space wrap className={styles.filterList}>
                    <Button
                      type={selectedGroup === null ? 'primary' : 'default'}
                      shape="round"
                      size="small"
                      onClick={() => {
                        setSelectedGroup(null);
                        setCurrent(1);
                        syncGroupToSearch(null);
                      }}
                    >
                      全部
                    </Button>
                    {flatGroups.map(group => (
                      <Button
                        key={group.id}
                        type={selectedGroup === group.id ? 'primary' : 'default'}
                        shape="round"
                        size="small"
                        style={group.level > 0 ? { marginLeft: group.level * 16 } : {}}
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setCurrent(1);
                          syncGroupToSearch(group.id);
                        }}
                      >
                        {group.name}
                      </Button>
                    ))}
                  </Space>
                );
              }}
            />
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
                placeholder={['发布开始', '发布结束']}
                value={publishTimeRange}
                onChange={dates => {
                  setPublishTimeRange(dates);
                  setCurrent(1);
                }}
              />
            </Space>
          </div>
        </section>

        <Fetch
          key={`${keyword}-${current}-${selectedGroup}-${createdUserId}-${publishTimeRange?.[0]?.valueOf()}-${publishTimeRange?.[1]?.valueOf()}`}
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
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无博客文章" />
                </div>
              );
            }

            return (
              <>
                <div className={styles.summaryBar}>
                  <div className={styles.summaryItem}>
                    <Text className={styles.summaryLabel}>文章数</Text>
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
                          {item.title}
                        </Title>
                      </div>
                      <div className={styles.tagRow}>
                        {item.groups?.slice(0, 3).map(group => (
                          <Tag key={group.id} className={classNames(styles['blogTag'])} style={{ margin: 0 }}>
                            {group.name}
                          </Tag>
                        ))}
                        {!item.isPublic && isLoggedIn && (
                          <Tag className={classNames(styles['blogTag'], styles['tagPrivate'])} style={{ margin: 0 }}>
                            私密
                          </Tag>
                        )}
                      </div>
                      <Paragraph ellipsis={{ rows: 3 }} className={styles.excerpt}>
                        {item.content?.replace(/<[^>]*>/g, '')}
                      </Paragraph>
                      <div className={styles.cardFooter}>
                        <Text className={styles.metaText}>{item.createdUser?.email?.split('@')[0] || '匿名'}</Text>
                        <Text className={styles.metaText}>{dayjs(item.publishTime || item.createdAt).format('YYYY-MM-DD')}</Text>
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
                      showTotal={value => `共 ${value} 篇文章`}
                    />
                  </div>
                )}
              </>
            );
          }}
        />
      </div>
    </Page>
  );
});

export default BlogList;
