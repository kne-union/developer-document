import CatalogPage from '@components/Shared/CatalogPage';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const List = withLocale(() => {
  const { formatMessage } = useIntl();

  const localizedGroupOptions = REMOTE_COMPONENT_GROUP_OPTIONS.map(item => ({
    ...item,
    label: formatMessage({ id: `shared.catalogMeta.${item.value}` })
  }));

  return (
    <CatalogPage
      pageName="components"
      title={formatMessage({ id: 'remoteComponent.list.title' })}
      description={formatMessage({ id: 'remoteComponent.list.description' })}
      headerVariant="remote"
      searchPlaceholder={formatMessage({ id: 'remoteComponent.list.searchPlaceholder' })}
      emptyDescription={formatMessage({ id: 'remoteComponent.list.emptyDescription' })}
      filterLabel={formatMessage({ id: 'remoteComponent.list.filterLabel' })}
      filterParam="group"
      groupOptions={localizedGroupOptions}
      groupFallback="common"
      getApi={(apis, isLoggedIn) => (isLoggedIn ? apis.remoteComponent.list : apis.remoteComponent.publicList)}
      getGroupKey={item => item.group || 'common'}
      getItemTitle={item => item.name || item.remote}
      getItemDescription={item => item.description}
      getItemIdentifier={item => item.remote}
      getItemVersion={item => item.defaultVersion || 'latest'}
      getNavigateTo={({ pathname, item }) => `${pathname}/detail?id=${item.id}`}
    />
  );
});

export default List;
