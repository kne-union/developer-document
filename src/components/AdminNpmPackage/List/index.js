import { createWithRemoteLoader } from '@kne/remote-loader';
import { useNavigate, useLocation } from 'react-router-dom';
import getColumns from './getColumns';
import { useRef, useState, useMemo } from 'react';
import { Space, Button } from 'antd';
import Create from '../Actions/Create';
import Actions from '../Actions';

const List = createWithRemoteLoader({
  modules: ['components-core:Layout@TablePage', 'components-core:Filter', 'components-core:Global@usePreset']
})(({ remoteModules, baseUrl: propsBaseUrl, ...props }) => {
  const [TablePage, Filter, usePreset] = remoteModules;
  const { apis } = usePreset();
  const { SearchInput, getFilterValue, fields: filterFields } = Filter;
  const { InputFilterItem, SelectFilterItem } = filterFields;
  const ref = useRef(null);
  const [filter, setFilter] = useState([]);
  const filterValue = getFilterValue(filter);
  const navigate = useNavigate();
  const location = useLocation();

  const baseUrl = useMemo(() => {
    if (propsBaseUrl) return propsBaseUrl;
    const pathParts = location.pathname.split('/').filter(Boolean);
    return '/' + pathParts.slice(0, 3).join('/');
  }, [propsBaseUrl, location.pathname]);

  return (
    <TablePage
      {...Object.assign({}, apis.npmPackage.list, {
        data: Object.assign({}, filterValue)
      })}
      ref={ref}
      name="list"
      pagination={{ paramsType: 'params' }}
      page={{
        ...props,
        filter: {
          value: filter,
          onChange: setFilter,
          list: [
            [<InputFilterItem label="Package Name" name="packageName" />],
            [<InputFilterItem label="显示名称" name="name" />],
            [
              <SelectFilterItem
                label="类型"
                name="type"
                options={[
                  { value: 'frontend', label: '前端组件' },
                  { value: 'nodejs', label: 'NodeJS' },
                  { value: 'engineering', label: '工程化' },
                  { value: 'miniprogram', label: '小程序' },
                  { value: 'prompts', label: 'Prompts' },
                  { value: 'other', label: '其他' }
                ]}
              />
            ]
          ]
        },
        titleExtra: (
          <Space align="center">
            <SearchInput name="keyword" label="关键字" />
            <Create type="primary" onSuccess={() => ref.current?.reload()}>
              添加组件
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
