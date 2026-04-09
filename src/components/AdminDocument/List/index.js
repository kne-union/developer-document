import { Space, Button } from 'antd';
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

const List = props => {
  const createStatusFilter = ({ value, label }) => {
    return { name: 'status', value: { label, value } };
  };

  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.document.list}
      buildRequestData={filterValue => {
        return Object.assign({}, filterValue, {
          status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
        });
      }}
      getFilterList={({ InputFilterItem }) => [[<InputFilterItem label="名称" name="name" />]]}
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
};

export default List;
