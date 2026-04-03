import { useState } from 'react';
import { Space, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
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
  const [loading, setLoading] = useState(false);

  const createStatusFilter = ({ value, label }) => {
    return { name: 'status', value: { label, value } };
  };

  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.blog.list}
      buildRequestData={filterValue => {
        return Object.assign({}, filterValue, {
          status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
        });
      }}
      getFilterList={({ InputFilterItem }) => [[<InputFilterItem label="标题" name="title" />]]}
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
              message.success('博客搜索任务已创建，请稍后刷新查看结果');
            } else {
              message.error(resData.message || '创建任务失败');
            }
          } catch (error) {
            message.error('创建任务失败');
          } finally {
            setLoading(false);
          }
        };

        return (
          <Space align="center">
            <SearchInput name="keyword" label="关键字" />
            <Button icon={<SyncOutlined spin={loading} />} loading={loading} onClick={handleTriggerSearch}>
              手动获取
            </Button>
            <Create type="primary" onSuccess={reload}>
              添加博客
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
