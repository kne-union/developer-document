import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import { getActionList } from '../Actions';
import getColumns from './getColumns';
import AdminEntityTablePage from '@components/Shared/AdminEntityTablePage';
import { NPM_PACKAGE_TYPE_OPTIONS } from '@components/Shared/catalogMeta';

const List = withLocale(props => {
  const { formatMessage } = useIntl();

  const localizedTypeOptions = NPM_PACKAGE_TYPE_OPTIONS.map(item => ({
    ...item,
    label: formatMessage({ id: `shared.catalogMeta.${item.value}` })
  }));

  return (
    <AdminEntityTablePage
      {...props}
      name="admin-npm-package-list"
      getApi={apis => apis.npmPackage.list}
      getFilterList={({ SuperSelectFilterItem }) => [[<SuperSelectFilterItem single label={formatMessage({ id: 'common.type' })} name="type" options={localizedTypeOptions} />]]}
      renderTitleExtra={({ reload }) => (
        <Create type="primary" onSuccess={reload}>
          {formatMessage({ id: 'adminNpmPackage.list.addComponent' })}
        </Create>
      )}
      getColumns={({ navigate, baseUrl }) => getColumns({ navigate, baseUrl, formatMessage })}
      getActionList={getActionList}
    />
  );
});

export default List;
