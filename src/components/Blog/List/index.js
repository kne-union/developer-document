import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Tag, Typography, Empty, Pagination, Input, Button, Space } from 'antd';
import { ReadOutlined, CodeOutlined, HeartOutlined, AppstoreOutlined, BgColorsOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { BLOG_GROUP_OPTIONS, BLOG_GROUP_LABELS } from '@components/Shared/blogMeta';
import { hasUserToken } from '@components/Shared/auth';
import styles from '../style.module.scss';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const iconMap = {
  all: ReadOutlined,
  tech: CodeOutlined,
  life: HeartOutlined,
  product: AppstoreOutlined,
  design: BgColorsOutlined,
  other: FileTextOutlined
};

const pageSize = 12;

const groupTagClassMap = {
  tech: 'tagTech',
  design: 'tagDesign',
  product: 'tagProduct',
  life: 'tagLife',
  other: 'tagOther'
};

const BlogList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(({ remoteModules, baseUrl: propsBaseUrl }) => {
  const [usePreset, Page] = remoteModules;
  const { apis } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || 'all');

  const isLoggedIn = useMemo(() => hasUserToken(), []);

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 2).join('/');
  }, [propsBaseUrl, location.pathname]);

  const apiConfig = isLoggedIn ? apis.blog.list : apis.blog.publicList;

  const syncGroupToSearch = nextGroup => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextGroup && nextGroup !== 'all') {
      nextSearchParams.set('group', nextGroup);
    } else {
      nextSearchParams.delete('group');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

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
    <Page name="blog">
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
            <div className={styles.filterList}>
              {BLOG_GROUP_OPTIONS.map(item => {
                const Icon = iconMap[item.value];
                return (
                  <Button
                    className={styles['filterButton']}
                    key={item.value}
                    size="small"
                    type={selectedGroup === item.value ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedGroup(item.value);
                      setCurrent(1);
                      syncGroupToSearch(item.value);
                    }}
                  >
                    <Space size={4}>
                      <Icon />
                      <span>{item.label}</span>
                    </Space>
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <Fetch
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
                    <Text className={styles.summaryLabel}>当前分类</Text>
                    <Text className={styles.summaryValue}>{selectedGroup === 'all' ? '全部' : BLOG_GROUP_LABELS[selectedGroup]}</Text>
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
                          <Tag key={group} className={classNames(styles['blogTag'], styles[groupTagClassMap[group] || 'tagOther'])} style={{ margin: 0 }}>
                            {BLOG_GROUP_LABELS[group] || group}
                          </Tag>
                        ))}
                        {!item.isPublic && isLoggedIn && (
                          <Tag className={classNames(styles['blogTag'], styles['tagPrivate'])} style={{ margin: 0 }}>
                            私密
                          </Tag>
                        )}
                      </div>
                      <Paragraph ellipsis={{ rows: 3 }} className={styles.excerpt}>
                        {item.content}
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
