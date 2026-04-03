import CatalogPage from '@components/Shared/CatalogPage';
import { REMOTE_COMPONENT_GROUP_OPTIONS } from '@components/Shared/catalogMeta';

const List = () => {
  return (
    <CatalogPage
      pageName="components"
      title="远程组件中心"
      description="集中展示远程组件能力与版本信息，方便接入、预览与联调。"
      headerVariant="remote"
      searchPlaceholder="搜索组件名称、remote 标识或描述"
      emptyDescription="未找到匹配的远程组件"
      filterLabel="分类"
      filterParam="group"
      groupOptions={REMOTE_COMPONENT_GROUP_OPTIONS}
      groupFallback="common"
      getApi={apis => apis.remoteComponent.publicList}
      getGroupKey={item => item.group || 'common'}
      getItemTitle={item => item.name || item.remote}
      getItemDescription={item => item.description}
      getItemIdentifier={item => item.remote}
      getItemVersion={item => item.defaultVersion || 'latest'}
      getNavigateTo={({ pathname, item }) => `${pathname}/detail?id=${item.id}`}
    />
  );
};

export default List;
