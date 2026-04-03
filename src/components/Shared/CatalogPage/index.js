import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { Button, Empty, Input, Skeleton, Space, Tag, Typography } from 'antd';
import { ApiOutlined, AppstoreOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './style.module.scss';

const { Search } = Input;
const { Title, Paragraph, Text } = Typography;

const CatalogSkeleton = () => {
  return (
    <div className={styles.cardGrid}>
      {Array.from({ length: 8 }).map((_, index) => (
        <div className={styles.cardSkeleton} key={index}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ))}
    </div>
  );
};

const SummaryItem = ({ label, value }) => {
  return (
    <div className={styles.summaryItem}>
      <Text className={styles.summaryLabel}>{label}</Text>
      <Text className={styles.summaryValue}>{value}</Text>
    </div>
  );
};

const CatalogPage = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:Global@usePreset']
})(({
  remoteModules,
  pageName = 'catalog-page',
  title,
  description,
  headerVariant = 'default',
  searchPlaceholder = '请输入关键字',
  emptyDescription = '暂无内容',
  filterLabel = '分类',
  filterParam = 'type',
  groupOptions = [],
  groupFallback,
  getApi,
  buildRequestData = ({ keyword, selectedFilter, filterParam }) => ({
    keyword,
    [filterParam]: selectedFilter || undefined
  }),
  getGroupKey,
  getItemTitle,
  getItemDescription,
  getItemIdentifier,
  getItemVersion,
  getNavigateTo,
  isPublic = item => item.isPublic !== false
}) => {
  const [Page, usePreset] = remoteModules;
  const { apis } = usePreset();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedFilter, setSelectedFilter] = useState(searchParams.get(filterParam) || '');

  const optionMap = useMemo(() => {
    return groupOptions.reduce((result, item) => {
      result[item.value] = item;
      return result;
    }, {});
  }, [groupOptions]);

  const syncParams = ({ nextKeyword = keyword, nextFilter = selectedFilter }) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextKeyword) {
      nextSearchParams.set('keyword', nextKeyword);
    } else {
      nextSearchParams.delete('keyword');
    }

    if (nextFilter) {
      nextSearchParams.set(filterParam, nextFilter);
    } else {
      nextSearchParams.delete(filterParam);
    }

    const queryString = nextSearchParams.toString();
    navigate(`${location.pathname}${queryString ? `?${queryString}` : ''}`, { replace: true });
  };

  const handleSearch = value => {
    const nextKeyword = value.trim();
    setKeyword(nextKeyword);
    syncParams({ nextKeyword });
  };

  const handleFilterChange = value => {
    setSelectedFilter(value);
    syncParams({ nextFilter: value });
  };

  const variantMetaMap = {
    npm: { label: 'NPM 生态' },
    remote: { label: '远程模块' },
    default: { label: '资源目录' }
  };
  const variantMeta = variantMetaMap[headerVariant] || variantMetaMap.default;
  const headerIconNode = headerVariant === 'npm' ? <ApiOutlined /> : headerVariant === 'remote' ? <CloudServerOutlined /> : <AppstoreOutlined />;

  const contentClassName = classNames(styles.content, headerVariant === 'npm' && styles['themeNpm'], headerVariant === 'remote' && styles['themeRemote'], headerVariant !== 'npm' && headerVariant !== 'remote' && styles['themeDefault']);

  const headerPanelClassName = classNames(styles.headerPanel, headerVariant === 'npm' && styles['headerPanelNpm'], headerVariant === 'remote' && styles['headerPanelRemote']);

  return (
    <Page name={pageName}>
      <div className={styles.page}>
        <div className={contentClassName}>
          <section className={headerPanelClassName}>
            <div className={styles.headerTop}>
              <div className={styles.headerText}>
                <div className={styles['headerIdentity']}>
                  <span className={styles['headerIdentityIcon']}>{headerIconNode}</span>
                  <Text className={styles['headerIdentityText']}>{variantMeta.label}</Text>
                </div>
                <Title level={2} className={styles.pageTitle}>
                  {title}
                </Title>
                <Paragraph className={styles.pageDescription}>{description}</Paragraph>
              </div>
              <div className={styles.searchBox}>
                <Search
                  allowClear
                  enterButton="搜索"
                  size="large"
                  placeholder={searchPlaceholder}
                  value={keyword}
                  onChange={event => {
                    const nextValue = event.target.value;
                    setKeyword(nextValue);
                    if (!nextValue) {
                      handleSearch('');
                    }
                  }}
                  onSearch={handleSearch}
                />
              </div>
            </div>
            <div className={styles.filterRow}>
              <Text className={styles.filterLabel}>{filterLabel}：</Text>
              <div className={styles.filterList}>
                <Button className={styles['filterButton']} size="small" type={selectedFilter ? 'default' : 'primary'} onClick={() => handleFilterChange('')}>
                  全部
                </Button>
                {groupOptions.map(item => (
                  <Button className={styles['filterButton']} key={item.value} size="small" type={selectedFilter === item.value ? 'primary' : 'default'} onClick={() => handleFilterChange(item.value)}>
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <Fetch
            {...Object.assign({}, getApi(apis), {
              data: buildRequestData({ keyword, selectedFilter, filterParam })
            })}
            render={({ data, loading }) => {
              const list = data?.pageData || [];
              const groupedData = list.reduce((result, item) => {
                const currentGroup = getGroupKey(item) || groupFallback;
                if (!result[currentGroup]) {
                  result[currentGroup] = [];
                }
                result[currentGroup].push(item);
                return result;
              }, {});

              const entries = (selectedFilter ? [[selectedFilter, groupedData[selectedFilter] || []]] : Object.entries(groupedData))
                .filter(([, items]) => items.length > 0)
                .sort((a, b) => {
                  const indexA = groupOptions.findIndex(item => item.value === a[0]);
                  const indexB = groupOptions.findIndex(item => item.value === b[0]);
                  if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
                  if (indexA === -1) return 1;
                  if (indexB === -1) return -1;
                  return indexA - indexB;
                });

              if (loading) {
                return <CatalogSkeleton />;
              }

              if (entries.length === 0) {
                return (
                  <div className={styles.emptyState}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword || selectedFilter ? emptyDescription : '暂无可展示内容'} />
                  </div>
                );
              }

              const activeMeta = selectedFilter ? optionMap[selectedFilter] : null;
              const activeText = activeMeta?.label || (keyword ? `搜索：${keyword}` : '全部');

              return (
                <>
                  <div className={styles.summaryBar}>
                    <SummaryItem label={`${filterLabel}数`} value={Object.keys(groupedData).length} />
                    <SummaryItem label="资源数" value={list.length} />
                    <SummaryItem label="当前筛选" value={activeText} />
                  </div>

                  {entries.map(([group, items]) => {
                    const currentMeta = optionMap[group] || { label: group, color: 'default' };

                    return (
                      <section className={styles.groupSection} key={group}>
                        <div className={styles.groupHeader}>
                          <Space size={8} align="center">
                            <Title level={4} className={styles.groupTitle}>
                              {currentMeta.label}
                            </Title>
                            <Tag className={styles['groupCountTag']}>{items.length}</Tag>
                          </Space>
                        </div>
                        <div className={styles.cardGrid}>
                          {items.map(item => (
                            <button
                              type="button"
                              key={item.id}
                              className={classNames(styles.card, styles.clickable)}
                              onClick={() => {
                                navigate(getNavigateTo({ pathname: location.pathname, item }));
                              }}
                            >
                              <div className={styles.cardHeader}>
                                <div className={styles.cardTitleBlock}>
                                  <Title level={4} className={styles.cardTitle} ellipsis={{ rows: 1 }}>
                                    {getItemTitle(item)}
                                  </Title>
                                  <Text className={styles.cardIdentifier} ellipsis>
                                    {getItemIdentifier(item)}
                                  </Text>
                                </div>
                                <Tag className={classNames(styles.versionTag, styles['semanticTagStrong'])}>{getItemVersion(item)}</Tag>
                              </div>
                              <Paragraph ellipsis={{ rows: 2 }} className={styles.cardDescriptionText}>
                                {getItemDescription(item) || '暂无描述'}
                              </Paragraph>
                              <div className={styles.cardMeta}>
                                <Space size={[6, 6]} wrap>
                                  <Tag bordered={false} className={styles['semanticTagSoft']}>
                                    {currentMeta.label}
                                  </Tag>
                                  {isPublic(item) && (
                                    <Tag bordered={false} className={styles['semanticTagMuted']}>
                                      公开
                                    </Tag>
                                  )}
                                </Space>
                                <Text className={styles.cardAction}>详情</Text>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </>
              );
            }}
          />
        </div>
      </div>
    </Page>
  );
});

export default CatalogPage;
