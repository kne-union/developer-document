import { Space } from 'antd';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import { NPM_PACKAGE_TYPE_OPTIONS } from '@components/Shared/catalogMeta';

const List = props => {
  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.npmPackage.list}
      getFilterList={({ InputFilterItem, SelectFilterItem }) => [
        [<InputFilterItem label="Package Name" name="packageName" />],
        [<InputFilterItem label="显示名称" name="name" />],
        [<SelectFilterItem label="类型" name="type" options={NPM_PACKAGE_TYPE_OPTIONS} />]
      ]}
      renderTitleExtra={({ SearchInput, reload }) => {
        return (
          <Space align="center">
            <SearchInput name="keyword" label="关键字" />
            <Create type="primary" onSuccess={reload}>
              添加组件
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
