import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { Button, Empty, Input, Pagination, Skeleton, Space, Tag, Typography } from 'antd';
import { ApiOutlined, AppstoreOutlined, CloudServerOutlined, RightOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import styles from './style.module.scss';

const { Search } = Input;
const { Title, Paragraph, Text } = Typography;

const PREVIEW_SIZE = 8;
const PAGE_SIZE = 24;

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
})(
  withLocale(
    ({
      remoteModules,
      pageName = 'catalog-page',
      title,
      description,
      headerVariant = 'default',
      searchPlaceholder,
      emptyDescription,
      filterLabel,
      filterParam = 'type',
      groupOptions = [],
      getApi,
      getItemTitle,
      getItemDescription,
      getItemIdentifier,
      getItemVersion,
      getNavigateTo,
      isPublic = item => item.isPublic !== false
    }) => {
      const [Page, usePreset] = remoteModules;
      const { apis, ajax } = usePreset();
      const { formatMessage } = useIntl();
      const navigate = useNavigate();
      const location = useLocation();
      const [searchParams] = useSearchParams();
      const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
      const [selectedFilter, setSelectedFilter] = useState(searchParams.get(filterParam) || '');
      const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

      const isLoggedIn = useMemo(() => hasUserToken(), []);

      const optionMap = useMemo(() => {
        return groupOptions.reduce((result, item) => {
          result[item.value] = item;
          return result;
        }, {});
      }, [groupOptions]);

      const syncParams = ({ nextKeyword = keyword, nextFilter = selectedFilter, nextPage = 1 }) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        setCurrentPage(nextPage);

        if (nextPage > 1) {
          nextSearchParams.set('page', nextPage);
        } else {
          nextSearchParams.delete('page');
        }

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

      const api = getApi(apis, isLoggedIn);

      const requestList = async params => {
        const { data: resData } = await ajax(Object.assign({}, api, { params }));
        if (resData.code !== 0) {
          throw new Error(resData.msg);
        }
        return resData.data;
      };

      const loadAllGroups = async ({ params }) => {
        const [total, ...groupResults] = await Promise.all([
          requestList({ keyword: params.keyword, perPage: 1, currentPage: 1 }),
          ...groupOptions.map(item => requestList({ keyword: params.keyword, [filterParam]: item.value, perPage: PREVIEW_SIZE, currentPage: 1 }))
        ]);
        return {
          totalCount: total.totalCount,
          groups: groupOptions.map((item, index) => Object.assign({ group: item.value }, groupResults[index])).filter(item => item.totalCount > 0)
        };
      };

      const variantMetaMap = {
        npm: { label: formatMessage({ id: 'shared.catalogPage.variantNpmLabel' }) },
        remote: { label: formatMessage({ id: 'shared.catalogPage.variantRemoteLabel' }) },
        default: { label: formatMessage({ id: 'shared.catalogPage.variantDefaultLabel' }) }
      };
      const variantMeta = variantMetaMap[headerVariant] || variantMetaMap.default;
      const headerIconNode = headerVariant === 'npm' ? <ApiOutlined /> : headerVariant === 'remote' ? <CloudServerOutlined /> : <AppstoreOutlined />;

      const contentClassName = classNames(styles.content, headerVariant === 'npm' && styles['themeNpm'], headerVariant === 'remote' && styles['themeRemote'], headerVariant !== 'npm' && headerVariant !== 'remote' && styles['themeDefault']);

      const headerPanelClassName = classNames(styles.headerPanel, headerVariant === 'npm' && styles['headerPanelNpm'], headerVariant === 'remote' && styles['headerPanelRemote']);

      const renderCatalog = ({ totalCount = 0, groups = [] } = {}) => {
        if (totalCount === 0) {
          return (
            <div className={styles.emptyState}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={keyword || selectedFilter ? emptyDescription || formatMessage({ id: 'shared.catalogPage.emptyNoContent' }) : formatMessage({ id: 'shared.catalogPage.emptyNoContent' })}
              />
            </div>
          );
        }

        const activeMeta = selectedFilter ? optionMap[selectedFilter] : null;
        const activeText = activeMeta?.label || (keyword ? `${formatMessage({ id: 'shared.catalogPage.searchPrefix' })}${keyword}` : formatMessage({ id: 'shared.catalogPage.allFilter' }));

        return (
          <>
            <div className={styles.summaryBar}>
              <SummaryItem label={formatMessage({ id: 'shared.catalogPage.categoryCount' }, { filterLabel: filterLabel || formatMessage({ id: 'common.category' }) })} value={groups.length} />
              <SummaryItem label={formatMessage({ id: 'shared.catalogPage.resourceCount' })} value={totalCount} />
              <SummaryItem label={formatMessage({ id: 'shared.catalogPage.currentFilter' })} value={activeText} />
            </div>

            {groups.map(({ group, totalCount: groupTotal, pageData: items }) => {
              const currentMeta = optionMap[group] || { label: group, color: 'default' };

              return (
                <section className={styles.groupSection} key={group}>
                  <div className={styles.groupHeader}>
                    <Space size={8} align="center">
                      <Title level={4} className={styles.groupTitle}>
                        {currentMeta.label}
                      </Title>
                      <Tag className={styles['groupCountTag']}>{groupTotal}</Tag>
                    </Space>
                    {!selectedFilter && groupTotal > items.length && (
                      <Button type="link" size="small" onClick={() => handleFilterChange(group)}>
                        {formatMessage({ id: 'shared.catalogPage.more' })}
                        <RightOutlined />
                      </Button>
                    )}
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
                          {getItemDescription(item) || formatMessage({ id: 'shared.catalogPage.noDescription' })}
                        </Paragraph>
                        <div className={styles.cardMeta}>
                          <Space size={[6, 6]} wrap>
                            <Tag bordered={false} className={styles['semanticTagSoft']}>
                              {currentMeta.label}
                            </Tag>
                            {isPublic(item) && (
                              <Tag bordered={false} className={styles['semanticTagMuted']}>
                                {formatMessage({ id: 'common.public' })}
                              </Tag>
                            )}
                          </Space>
                          <Text className={styles.cardAction}>{formatMessage({ id: 'shared.catalogPage.detailAction' })}</Text>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedFilter && groupTotal > PAGE_SIZE && (
                    <div className={styles.pagination}>
                      <Pagination current={currentPage} pageSize={PAGE_SIZE} total={groupTotal} showSizeChanger={false} onChange={page => syncParams({ nextPage: page })} />
                    </div>
                  )}
                </section>
              );
            })}
          </>
        );
      };

      return (
        <Page name={pageName} noMargin>
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
                      enterButton={formatMessage({ id: 'shared.catalogPage.searchButton' })}
                      size="large"
                      placeholder={searchPlaceholder || formatMessage({ id: 'common.search' })}
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
                  <Text className={styles.filterLabel}>{filterLabel || formatMessage({ id: 'common.category' })}：</Text>
                  <div className={styles.filterList}>
                    <Button className={styles['filterButton']} size="small" type={selectedFilter ? 'default' : 'primary'} onClick={() => handleFilterChange('')}>
                      {formatMessage({ id: 'shared.catalogPage.allFilter' })}
                    </Button>
                    {groupOptions.map(item => (
                      <Button className={styles['filterButton']} key={item.value} size="small" type={selectedFilter === item.value ? 'primary' : 'default'} onClick={() => handleFilterChange(item.value)}>
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>

              {selectedFilter ? (
                <Fetch
                  key={`filter-${selectedFilter}`}
                  {...api}
                  params={{ keyword, [filterParam]: selectedFilter, perPage: PAGE_SIZE, currentPage }}
                  loading={<CatalogSkeleton />}
                  render={({ data }) => renderCatalog({ totalCount: data?.totalCount || 0, groups: [{ group: selectedFilter, totalCount: data?.totalCount || 0, pageData: data?.pageData || [] }] })}
                />
              ) : (
                <Fetch key="all" params={{ keyword }} loader={loadAllGroups} loading={<CatalogSkeleton />} render={({ data }) => renderCatalog(data)} />
              )}
            </div>
          </div>
        </Page>
      );
    }
  )
);

export default CatalogPage;
