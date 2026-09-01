import { useMemo, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tabs } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import dayjs from 'dayjs';

const SEARCH_TYPE_LABELS = {
  experience: 'adminSearchAnalytics.searchType.experience',
  document_index: 'adminSearchAnalytics.searchType.documentIndex',
  document: 'adminSearchAnalytics.searchType.document'
};

const RecordsTab = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();

    return (
      <AdminEntityTablePage
        name="admin-search-analytics-records"
        keywordFilterName="query"
        keywordFilterLabel={formatMessage({ id: 'adminSearchAnalytics.columns.query' })}
        getApi={apis => apis.searchAnalytics.records}
        buildRequestData={filterValue => {
          const result = Object.assign({}, filterValue);
          if (filterValue.createdAt?.value?.[0] && filterValue.createdAt?.value?.[1]) {
            result.startAt = filterValue.createdAt.value[0];
            result.endAt = filterValue.createdAt.value[1];
          }
          delete result.createdAt;
          return result;
        }}
        getFilterList={({ SuperSelectFilterItem, TypeDateRangePickerFilterItem }) => {
          return [
            [
              <SuperSelectFilterItem
                key="searchType"
                single
                label={formatMessage({ id: 'adminSearchAnalytics.columns.searchType' })}
                name="searchType"
                options={[
                  { label: formatMessage({ id: 'adminSearchAnalytics.searchType.experience' }), value: 'experience' },
                  { label: formatMessage({ id: 'adminSearchAnalytics.searchType.documentIndex' }), value: 'document_index' },
                  { label: formatMessage({ id: 'adminSearchAnalytics.searchType.document' }), value: 'document' }
                ]}
              />,
              <TypeDateRangePickerFilterItem key="createdAt" label={formatMessage({ id: 'common.createdAt' })} name="createdAt" />
            ]
          ];
        }}
        getColumns={() => [
          {
            name: 'createdAt',
            title: formatMessage({ id: 'common.createdAt' }),
            type: 'datetime'
          },
          {
            name: 'searchType',
            title: formatMessage({ id: 'adminSearchAnalytics.columns.searchType' }),
            type: 'text',
            valueOf: item => formatMessage({ id: SEARCH_TYPE_LABELS[item.searchType] || 'common.unknown' })
          },
          {
            name: 'query',
            title: formatMessage({ id: 'adminSearchAnalytics.columns.query' }),
            type: 'text'
          },
          {
            name: 'hitCount',
            title: formatMessage({ id: 'adminSearchAnalytics.columns.hitCount' }),
            type: 'text'
          },
          {
            name: 'source',
            title: formatMessage({ id: 'adminSearchAnalytics.columns.source' }),
            type: 'text'
          },
          {
            name: 'createdUser',
            title: formatMessage({ id: 'common.creator' }),
            type: 'text',
            valueOf: item => item.createdUser?.email || item.createdUser?.nickname || '-'
          },
          {
            name: 'topHits',
            title: formatMessage({ id: 'adminSearchAnalytics.columns.topHits' }),
            type: 'text',
            valueOf: item => {
              const hits = item.topHits || [];
              if (!hits.length) {
                return '-';
              }
              return hits.map(h => h.title || h.path || h.id).join(', ');
            }
          }
        ]}
      />
    );
  })
);

const StatsTab = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [days, setDays] = useState(7);

    const summaryApi = useMemo(() => apis.searchAnalytics.summary, [apis]);
    const trendApi = useMemo(() => Object.assign({}, apis.searchAnalytics.trend, { params: { days } }), [apis, days]);
    const topQueriesApi = useMemo(() => apis.searchAnalytics.topQueries, [apis]);

    return (
      <Fetch
        {...summaryApi}
        name="summary"
        render={({ data: summary }) => (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title={formatMessage({ id: 'adminSearchAnalytics.stats.total' })} value={summary?.total || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={formatMessage({ id: 'adminSearchAnalytics.stats.hitTotal' })} value={summary?.hitTotal || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={formatMessage({ id: 'adminSearchAnalytics.stats.zeroHitTotal' })} value={summary?.zeroHitTotal || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title={formatMessage({ id: 'adminSearchAnalytics.stats.hitRate' })} value={((summary?.hitRate || 0) * 100).toFixed(1)} suffix="%" />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title={formatMessage({ id: 'adminSearchAnalytics.stats.byType' })}>
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="searchType"
                    dataSource={summary?.byType || []}
                    columns={[
                      {
                        title: formatMessage({ id: 'adminSearchAnalytics.columns.searchType' }),
                        dataIndex: 'searchType',
                        render: v => formatMessage({ id: SEARCH_TYPE_LABELS[v] || 'common.unknown' })
                      },
                      { title: formatMessage({ id: 'adminSearchAnalytics.stats.searchCount' }), dataIndex: 'count' },
                      { title: formatMessage({ id: 'adminSearchAnalytics.stats.hits' }), dataIndex: 'hitCount' }
                    ]}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Fetch
                  {...topQueriesApi}
                  name="topQueries"
                  render={({ data: topQueries }) => (
                    <Card title={formatMessage({ id: 'adminSearchAnalytics.stats.topQueries' })}>
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="query"
                        dataSource={topQueries || []}
                        columns={[
                          { title: formatMessage({ id: 'adminSearchAnalytics.columns.query' }), dataIndex: 'query' },
                          { title: formatMessage({ id: 'adminSearchAnalytics.stats.searchCount' }), dataIndex: 'searchCount' },
                          { title: formatMessage({ id: 'adminSearchAnalytics.stats.hits' }), dataIndex: 'hitCount' }
                        ]}
                      />
                    </Card>
                  )}
                />
              </Col>
            </Row>

            <Card
              style={{ marginTop: 16 }}
              title={formatMessage({ id: 'adminSearchAnalytics.stats.trend' })}
              extra={
                <Tabs
                  size="small"
                  activeKey={String(days)}
                  onChange={v => setDays(Number(v))}
                  items={[
                    { key: '7', label: formatMessage({ id: 'adminSearchAnalytics.stats.days7' }) },
                    { key: '30', label: formatMessage({ id: 'adminSearchAnalytics.stats.days30' }) }
                  ]}
                />
              }
            >
              <Fetch
                {...trendApi}
                name="trend"
                render={({ data: trend }) => (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="day"
                    dataSource={trend || []}
                    columns={[
                      {
                        title: formatMessage({ id: 'adminSearchAnalytics.stats.day' }),
                        dataIndex: 'day',
                        render: v => (v ? dayjs(v).format('YYYY-MM-DD') : '-')
                      },
                      { title: formatMessage({ id: 'adminSearchAnalytics.stats.searchCount' }), dataIndex: 'searchCount' },
                      { title: formatMessage({ id: 'adminSearchAnalytics.stats.hits' }), dataIndex: 'hitCount' }
                    ]}
                  />
                )}
              />
            </Card>
          </>
        )}
      />
    );
  })
);

const Dashboard = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(
  withLocale(({ remoteModules, menu, ...props }) => {
    const [, Page] = remoteModules;
    const { formatMessage } = useIntl();

    return (
      <Page {...props} menu={menu} title={formatMessage({ id: 'adminSearchAnalytics.pageTitle' })}>
        <Tabs
          items={[
            {
              key: 'records',
              label: formatMessage({ id: 'adminSearchAnalytics.tabs.records' }),
              children: <RecordsTab />
            },
            {
              key: 'stats',
              label: formatMessage({ id: 'adminSearchAnalytics.tabs.stats' }),
              children: <StatsTab />
            }
          ]}
        />
      </Page>
    );
  })
);

export default Dashboard;
