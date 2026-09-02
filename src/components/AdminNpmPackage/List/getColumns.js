import { Tag } from 'antd';
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
      }
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => item.name || '-'
    },
    {
      name: 'type',
      title: formatMessage({ id: 'common.type' }),
      render: (_, { dataSource }) => {
        const type = dataSource.type || 'other';
        return <Tag color={NPM_PACKAGE_TYPE_COLORS[type] || 'default'}>{formatMessage({ id: `shared.catalogMeta.${type}` })}</Tag>;
      }
    },
    {
      name: 'latestVersion',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.latestVersion' }),
      getValueOf: item => item.latestVersion || '-'
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      renderType: 'tag',
      getValueOf: item => (item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.yes' }) } : { type: 'warning', text: formatMessage({ id: 'common.no' }) })
    },
    {
      name: 'description',
      title: formatMessage({ id: 'common.description' }),
      renderType: 'description',
      ellipsis: true,
      getValueOf: item => item.description || '-'
    }
  ];
};

export default getColumns;
