import { Space } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Create from '../Actions/Create';
import Actions from '../Actions';
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
      getApi={apis => apis.npmPackage.list}
      getFilterList={({ SuperSelectFilterItem }) => [[<SuperSelectFilterItem single label={formatMessage({ id: 'common.type' })} name="type" options={localizedTypeOptions} />]]}
      renderTitleExtra={({ SearchInput, reload }) => {
        return (
          <Space align="center">
            <SearchInput name="keyword" label={formatMessage({ id: 'common.keyword' })} />
            <Create type="primary" onSuccess={reload}>
              {formatMessage({ id: 'adminNpmPackage.list.addComponent' })}
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
