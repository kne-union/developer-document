import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import { getActionList } from '../Actions';
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
      name="admin-remote-component-list"
      getApi={apis => apis.remoteComponent.list}
      getFilterList={({ SuperSelectFilterItem }) => [[<SuperSelectFilterItem label={formatMessage({ id: 'adminRemoteComponent.list.categoryFilterLabel' })} name="group" options={localizedGroupOptions} />]]}
      renderTitleExtra={({ reload }) => (
        <Create type="primary" onSuccess={reload}>
          {formatMessage({ id: 'adminRemoteComponent.list.addComponent' })}
        </Create>
      )}
      getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
      getActionList={getActionList}
    />
  );
});

export default List;
