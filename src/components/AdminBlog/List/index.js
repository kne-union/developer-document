import { useState, useMemo } from 'react';
import { Space, Button, App } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';

const List = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, ...props }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();

    const statusOptions = useMemo(
      () => [
        { tab: formatMessage({ id: 'common.all' }), key: 'all' },
        { tab: formatMessage({ id: 'common.draft' }), key: 'draft' },
        { tab: formatMessage({ id: 'common.published' }), key: 'published' }
      ],
      [formatMessage]
    );

    const statusMap = useMemo(() => new Map(statusOptions.map(item => [item.key, item])), [statusOptions]);

    const createStatusFilter = ({ value, label }) => {
      return { name: 'status', value: { label, value } };
    };

    return (
      <AdminEntityTablePage
        {...props}
        getApi={apis => apis.blog.list}
        buildRequestData={filterValue => {
          const result = Object.assign({}, filterValue, {
            status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
          });

          if (filterValue.publishTime?.value?.[0] && filterValue.publishTime?.value?.[1]) {
            result.publishTimeStart = filterValue.publishTime.value[0];
            result.publishTimeEnd = filterValue.publishTime.value[1];
          }
          delete result.publishTime;

          if (filterValue.groups) {
            const code = filterValue.groups.value || filterValue.groups;
            if (code) {
              result.group = code;
            }
          }
          delete result.groups;

          return result;
        }}
        getFilterList={({ SuperSelectUserFilterItem, SuperSelectFilterItem, TypeDateRangePickerFilterItem }) => {
          return [
            [
              <SuperSelectFilterItem
                label={formatMessage({ id: 'adminBlog.list.tagLabel' })}
                name="groups"
                single
                api={Object.assign({}, apis.group.list, { params: { type: 'blog' } })}
                getSearchProps={({ searchText }) => ({ filter: { keyword: searchText } })}
                interceptor={{
                  input: value => value && { code: value.value, name: value.label },
                  output: value => value && { value: value.code, label: value.name }
                }}
                pagination={{ paramsType: 'params' }}
                valueKey="code"
                labelKey="name"
              />,
              <SuperSelectUserFilterItem
                single
                label={formatMessage({ id: 'common.publishUser' })}
                name="createdUserId"
                api={Object.assign({}, apis.admin.getUserList, {
                  transformData: data => {
                    return Object.assign({}, data, {
                      pageData: (data.pageData || []).map(item =>
                        Object.assign({}, item, {
                          value: item.id,
                          label: item.nickname || item.email || item.phone
                        })
                      )
                    });
                  }
                })}
              />,
              <TypeDateRangePickerFilterItem label={formatMessage({ id: 'adminBlog.list.publishTime' })} name="publishTime" />
            ]
          ];
        }}
        renderTopArea={({ filterValue, setFilter, StateBar }) => {
          return (
            <StateBar
              type="radio"
              size="small"
              activeKey={filterValue.status || 'all'}
              onChange={value => {
                const currentState = statusMap.get(value);
                setFilter(filter => {
                  const nextFilter = filter.slice(0);
                  const currentIndex = filter.findIndex(item => item.name === 'status');

                  if (currentState.key === 'all') {
                    if (currentIndex > -1) {
                      nextFilter.splice(currentIndex, 1);
                    }
                  } else if (currentIndex === -1) {
                    nextFilter.push(createStatusFilter({ value: currentState.key, label: currentState.tab }));
                  } else {
                    nextFilter.splice(currentIndex, 1, createStatusFilter({ value: currentState.key, label: currentState.tab }));
                  }

                  return nextFilter;
                });
              }}
              stateOption={statusOptions}
            />
          );
        }}
        renderTitleExtra={({ SearchInput, reload, ajax, apis }) => {
          const handleTriggerSearch = async () => {
            setLoading(true);
            try {
              const { data: resData } = await ajax(apis.blog.triggerSearch);
              if (resData.code === 0) {
                message.success(formatMessage({ id: 'adminBlog.list.searchTaskCreated' }));
              } else {
                message.error(resData.message || formatMessage({ id: 'adminBlog.list.createTaskFailed' }));
              }
            } catch (error) {
              message.error(formatMessage({ id: 'adminBlog.list.createTaskFailed' }));
            } finally {
              setLoading(false);
            }
          };

          return (
            <Space align="center">
              <SearchInput name="keyword" label={formatMessage({ id: 'common.keyword' })} />
              <Button icon={<SyncOutlined spin={loading} />} loading={loading} onClick={handleTriggerSearch}>
                {formatMessage({ id: 'adminBlog.list.manualFetch' })}
              </Button>
              <Create type="primary" onSuccess={reload}>
                {formatMessage({ id: 'adminBlog.list.addBlog' })}
              </Create>
            </Space>
          );
        }}
        getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
        renderActions={({ item, reload }) => <Actions data={item} onSuccess={reload} />}
      />
    );
  })
);

export default List;
