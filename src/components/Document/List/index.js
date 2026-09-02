import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classNames from 'classnames';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Tag, Typography, Empty, Pagination, Input, Tree, Space, DatePicker } from 'antd';
import { FileTextOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import goAdminDetail from '@components/Shared/goAdminDetail';
import styles from '../style.module.scss';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const pageSize = 12;

const DocumentList = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Global@useGlobalValue', 'components-admin:UserSelect']
})(
  withLocale(({ remoteModules, baseUrl: propsBaseUrl }) => {
    const [usePreset, Page, useGlobalValue, UserSelect] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [keyword, setKeyword] = useState('');
    const [current, setCurrent] = useState(1);
    const locale = useGlobalValue('locale');
    const isLoggedIn = useMemo(() => hasUserToken(), []);
    const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || null);
    const [createdUserId, setCreatedUserId] = useState(null);
    const [createdAtRange, setCreatedAtRange] = useState(null);

    const baseUrl = useMemo(() => {
      if (propsBaseUrl) return propsBaseUrl;
      const pathParts = location.pathname.split('/').filter(Boolean);
      return '/' + pathParts.slice(0, 2).join('/');
    }, [propsBaseUrl, location.pathname]);

    const apiConfig = isLoggedIn ? apis.document.list : apis.document.publicList;

    const syncGroupToSearch = nextGroup => {
      setSelectedGroup(nextGroup);
      setCurrent(1);
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
        currentPage: current,
        perPage: pageSize,
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
                  <Text className={styles['headerIdentityText']}>{formatMessage({ id: 'document.list.identityLabel' })}</Text>
                </div>
                <Title level={2} className={styles.pageTitle}>
                  {formatMessage({ id: 'document.list.pageTitle' })}
                </Title>
                <Paragraph className={styles.pageDescription}>{formatMessage({ id: 'document.list.pageDescription' })}</Paragraph>
              </div>
              <div className={styles.searchBox}>
                <Search
                  allowClear
                  enterButton={formatMessage({ id: 'common.search' })}
                  size="large"
                  placeholder={formatMessage({ id: 'document.list.searchPlaceholder' })}
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
              <Text className={styles.filterLabel}>{formatMessage({ id: 'common.filter' })}</Text>
              <Space wrap className={styles.filterList} align="center">
                {isLoggedIn && (
                  <UserSelect.Field
                    className={styles['user-select']}
                    single
                    allowClear
                    size="small"
                    placeholder={formatMessage({ id: 'common.publishUser' })}
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
                  placeholder={[formatMessage({ id: 'document.list.createTimeStart' }), formatMessage({ id: 'document.list.createTimeEnd' })]}
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
                <Text className={styles.sidebarTitle}>{formatMessage({ id: 'document.list.folder' })}</Text>
              </div>
              <Fetch
                {...apis.group.groupList}
                params={{ type: 'document', language: locale, output: 'tree' }}
                render={({ data, loading }) => {
                  if (loading) {
                    return <div className={styles.sidebarLoading}>{formatMessage({ id: 'common.loading' })}</div>;
                  }

                  const treeData = [
                    {
                      code: 'root',
                      name: formatMessage({ id: 'document.list.allDocuments' }),
                      children: data
                    }
                  ];

                  return (
                    <Tree
                      showIcon
                      defaultExpandAll
                      selectedKeys={[selectedGroup || 'root']}
                      treeData={treeData}
                      titleRender={item => item.name}
                      fieldNames={{ title: 'name', key: 'code', children: 'children' }}
                      onSelect={keys => {
                        const selectedKey = keys[0];
                        syncGroupToSearch(selectedKey === 'root' ? null : selectedKey);
                      }}
                      icon={props => {
                        if (props.code === 'root') return <FileTextOutlined />;
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
                    return <div className={styles.emptyState}>{formatMessage({ id: 'common.loading' })}</div>;
                  }

                  if (list.length === 0) {
                    return (
                      <div className={styles.emptyState}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'document.list.emptyDescription' })} />
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className={styles.summaryBar}>
                        <div className={styles.summaryItem}>
                          <Text className={styles.summaryLabel}>{formatMessage({ id: 'document.list.documentCount' })}</Text>
                          <Text className={styles.summaryValue}>{total}</Text>
                        </div>
                        <div className={styles.summaryItem}>
                          <Text className={styles.summaryLabel}>{formatMessage({ id: 'document.list.browseMode' })}</Text>
                          <Text className={styles.summaryValue}>{isLoggedIn ? formatMessage({ id: 'document.list.loggedIn' }) : formatMessage({ id: 'document.list.publicMode' })}</Text>
                        </div>
                      </div>

                      <div className={styles.cardGrid}>
                        {list.map(item => (
                          <button type="button" key={item.id} className={styles.card} onClick={() => goAdminDetail(navigate, item)}>
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
                                  {formatMessage({ id: 'common.private' })}
                                </Tag>
                              )}
                            </div>
                            <Paragraph ellipsis={{ rows: 3 }} className={styles.excerpt}>
                              {item.content?.replace(/<[^>]*>/g, '')}
                            </Paragraph>
                            <div className={styles.cardFooter}>
                              <Text className={styles.metaText}>{item.createdUser?.email?.split('@')[0] || formatMessage({ id: 'common.anonymous' })}</Text>
                              <Text className={styles.metaText}>{dayjs(item.createdAt).format('YYYY-MM-DD')}</Text>
                              <Text className={styles.cardAction}>{formatMessage({ id: 'common.viewDetails' })}</Text>
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
                            showTotal={value => formatMessage({ id: 'document.list.totalDocuments' }, { value })}
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
  })
);

export default DocumentList;
