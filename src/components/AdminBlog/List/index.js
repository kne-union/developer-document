import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate, useLocation } from 'react-router-dom';
import getColumns from './getColumns';
import { useRef, useState, useMemo } from 'react';
import { Space, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import Create from '../Actions/Create';
import Actions from '../Actions';

const statusOptions = [
  { tab: '全部', key: 'all' },
  { tab: '草稿', key: 'draft' },
  { tab: '已发布', key: 'published' }
];

const statusMap = new Map(statusOptions.map(item => [item.key, item]));

const List = createWithRemoteLoader({
  modules: ['components-core:Layout@TablePage', 'components-core:Filter', 'components-core:Global@usePreset', 'components-core:StateBar']
})(({ remoteModules, baseUrl: propsBaseUrl, ...props }) => {
  const [TablePage, Filter, usePreset, StateBar] = remoteModules;
  const { ajax, apis } = usePreset();
  const { SearchInput, getFilterValue, fields: filterFields } = Filter;
  const { InputFilterItem } = filterFields;
  const ref = useRef(null);
  const [filter, setFilter] = useState([]);
  const [loading, setLoading] = useState(false);
  const filterValue = getFilterValue(filter);
  const navigate = useNavigate();
  const location = useLocation();

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 3).join('/');
  }, [propsBaseUrl, location.pathname]);

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
    <TablePage
      {...Object.assign({}, apis.blog.list, {
        data: Object.assign({}, filterValue, {
          status: filterValue.status && filterValue.status !== 'all' ? filterValue.status : undefined
        })
      })}
      ref={ref}
      name="list"
      pagination={{ paramsType: 'params' }}
      topArea={
        <StateBar
          type="radio"
          size="small"
          activeKey={filterValue.status || 'all'}
          onChange={value => {
            const currentState = statusMap.get(value);
            setFilter(filter => {
              const newFilter = filter.slice(0);
              const currentIndex = filter.findIndex(item => item.name === 'status');

              if (currentState.key === 'all') {
                newFilter.splice(currentIndex, 1);
              } else if (currentIndex === -1) {
                newFilter.push({ name: 'status', value: { label: currentState.tab, value: currentState.key } });
              } else {
                newFilter.splice(currentIndex, 1, {
                  name: 'status',
                  value: { label: currentState.tab, value: currentState.key }
                });
              }
              return newFilter;
            });
          }}
          stateOption={statusOptions}
        />
      }
      page={{
        ...props,
        filter: {
          value: filter,
          onChange: setFilter,
          list: [[<InputFilterItem label="标题" name="title" />]]
        },
        titleExtra: (
          <Space align="center">
            <SearchInput name="keyword" label="关键字" />
            <Button icon={<SyncOutlined spin={loading} />} loading={loading} onClick={handleTriggerSearch}>
              手动获取
            </Button>
            <Create type="primary" onSuccess={() => ref.current?.reload()}>
              添加博客
            </Create>
          </Space>
        )
      }}
      columns={[
        ...getColumns({ navigate, baseUrl }),
        {
          name: 'options',
          title: '操作',
          type: 'options',
          fixed: 'right',
          valueOf: item => {
            return {
              children: <Actions data={item} onSuccess={() => ref.current?.reload()} />
            };
          }
        }
      ]}
    />
  );
});

export default List;
