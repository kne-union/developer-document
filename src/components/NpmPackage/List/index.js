import CatalogPage from '@components/Shared/CatalogPage';
import { NPM_PACKAGE_TYPE_OPTIONS } from '@components/Shared/catalogMeta';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const List = withLocale(() => {
  const { formatMessage } = useIntl();

  const localizedTypeOptions = NPM_PACKAGE_TYPE_OPTIONS.map(item => ({
    ...item,
    label: formatMessage({ id: `shared.catalogMeta.${item.value}` })
  }));

  return (
    <CatalogPage
      pageName="components"
      title={formatMessage({ id: 'npmPackage.list.title' })}
      description={formatMessage({ id: 'npmPackage.list.description' })}
      headerVariant="npm"
      searchPlaceholder={formatMessage({ id: 'npmPackage.list.searchPlaceholder' })}
      emptyDescription={formatMessage({ id: 'npmPackage.list.emptyDescription' })}
      filterLabel={formatMessage({ id: 'npmPackage.list.filterLabel' })}
      filterParam="type"
      groupOptions={localizedTypeOptions}
      groupFallback="other"
      getApi={(apis, isLoggedIn) => (isLoggedIn ? apis.npmPackage.list : apis.npmPackage.publicList)}
      getGroupKey={item => item.type || 'other'}
      getItemTitle={item => item.name || item.packageName}
      getItemDescription={item => item.description}
      getItemIdentifier={item => item.packageName}
      getItemVersion={item => item.latestVersion || '-'}
      getNavigateTo={({ item }) => `detail?id=${encodeURIComponent(item.id)}`}
    />
  );
});

export default List;
