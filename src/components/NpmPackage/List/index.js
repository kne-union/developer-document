import CatalogPage from '@components/Shared/CatalogPage';
import { NPM_PACKAGE_TYPE_OPTIONS } from '@components/Shared/catalogMeta';

const List = () => {
  return (
    <CatalogPage
      pageName="components"
      title="组件资源中心"
      description="聚合组件、工具与 prompts 资源，便于快速检索和复用。"
      headerVariant="npm"
      searchPlaceholder="搜索组件名称、包名或描述"
      emptyDescription="未找到匹配的组件资源"
      filterLabel="类型"
      filterParam="type"
      groupOptions={NPM_PACKAGE_TYPE_OPTIONS}
      groupFallback="other"
      getApi={(apis, isLoggedIn) => (isLoggedIn ? apis.npmPackage.list : apis.npmPackage.publicList)}
      getGroupKey={item => item.type || 'other'}
      getItemTitle={item => item.name || item.packageName}
      getItemDescription={item => item.description}
      getItemIdentifier={item => item.packageName}
      getItemVersion={item => item.latestVersion || '-'}
      getNavigateTo={({ pathname, item }) => `${pathname}/detail?id=${item.id}`}
    />
  );
};

export default List;
