import { Space, Button } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';

const statusOptions = [
  { tab: '全部', key: 'all' },
  { tab: '草稿', key: 'draft' },
  { tab: '已发布', key: 'published' }
];

const statusMap = new Map(statusOptions.map(item => [item.key, item]));

const List = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(({ remoteModules, ...props }) => {
  const [usePreset] = remoteModules;
  const { apis } = usePreset();
  const createStatusFilter = ({ value, label }) => {
    return { name: 'status', value: { label, value } };
  };

  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.document.list}
      buildRequestData={filterValue => {
        const result = Object.assign({}, filterValue, {
          status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
        });

        if (filterValue.createdAt?.value?.[0] && filterValue.createdAt?.value?.[1]) {
          result.createdAtStart = filterValue.createdAt.value[0];
          result.createdAtEnd = filterValue.createdAt.value[1];
        }
        delete result.createdAt;

        return result;
      }}
      getFilterList={({ SuperSelectUserFilterItem, TypeDateRangePickerFilterItem }) => {
        return [
          [
            <SuperSelectUserFilterItem
              single
              label="发布用户"
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
            <TypeDateRangePickerFilterItem label="创建时间" name="createdAt" />
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
      renderTitleExtra={({ SearchInput, reload }) => {
        return (
          <Space align="center">
            <SearchInput name="keyword" label="关键字" />
            <Create type="primary" onSuccess={reload}>
              添加文档
            </Create>
          </Space>
        );
      }}
      getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl })}
      renderActions={({ item, reload }) => <Actions data={item} onSuccess={reload} />}
    />
  );
});

export default List;
