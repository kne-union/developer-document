import { NPM_PACKAGE_TYPE_COLORS } from '@components/Shared/catalogMeta';
import goAdminDetail from '@components/Shared/goAdminDetail';

const getColumns = ({ navigate, formatMessage }) => {
  return [
    {
      name: 'packageName',
      title: 'Package Name',
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => item.packageName || item.name || null
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => {
        // 展示名与包名相同时不重复占副标题
        if (!item.name || item.name === item.packageName) return null;
        return item.name;
      }
    },
    {
      name: 'type',
      title: formatMessage({ id: 'common.type' }),
      renderType: 'tag',
      getValueOf: item => {
        const type = item.type || 'other';
        return {
          type: NPM_PACKAGE_TYPE_COLORS[type] || 'default',
          text: formatMessage({ id: `shared.catalogMeta.${type}` })
        };
      }
    },
    {
      name: 'latestVersion',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.latestVersion' }),
      getValueOf: item => item.latestVersion || null
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      renderType: 'tag',
      getValueOf: item => (item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.public' }) } : { type: 'default', text: formatMessage({ id: 'common.private' }) })
    },
    {
      name: 'description',
      title: formatMessage({ id: 'common.description' }),
      renderType: 'description',
      ellipsis: true,
      getValueOf: item => item.description || null
    }
  ];
};

export default getColumns;
