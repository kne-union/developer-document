import { Space } from 'antd';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';

const List = props => {
  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.remoteComponent.list}
      getFilterList={({ SuperSelectFilterItem }) => [[<SuperSelectFilterItem label="组件分类" name="group" options={REMOTE_COMPONENT_GROUP_OPTIONS} />]]}
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
