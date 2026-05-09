import { Space } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import Actions from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';

const List = withLocale(props => {
  const { formatMessage } = useIntl();

  const localizedGroupOptions = REMOTE_COMPONENT_GROUP_OPTIONS.map(item => ({
    ...item,
    label: formatMessage({ id: `shared.catalogMeta.${item.value}` })
  }));

  return (
    <AdminEntityTablePage
      {...props}
      getApi={apis => apis.remoteComponent.list}
      getFilterList={({ SuperSelectFilterItem }) => [[<SuperSelectFilterItem label={formatMessage({ id: 'adminRemoteComponent.list.categoryFilterLabel' })} name="group" options={localizedGroupOptions} />]]}
      renderTitleExtra={({ SearchInput, reload }) => {
        return (
          <Space align="center">
            <SearchInput name="keyword" label={formatMessage({ id: 'common.keyword' })} />
            <Create type="primary" onSuccess={reload}>
              {formatMessage({ id: 'adminRemoteComponent.list.addComponent' })}
            </Create>
          </Space>
        );
      }}
      getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
      renderActions={({ item, reload }) => <Actions data={item} onSuccess={reload} />}
    />
  );
});

export default List;
