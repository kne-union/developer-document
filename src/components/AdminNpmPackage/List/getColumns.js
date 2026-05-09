import { Tag } from 'antd';
import { NPM_PACKAGE_TYPE_COLORS } from '@components/Shared/catalogMeta';

const getColumns = ({ navigate, baseUrl, formatMessage }) => {
  return [
    {
      name: 'packageName',
      title: 'Package Name',
      valueOf: item => item.packageName,
      primary: true,
      hover: true,
      onClick: ({ colItem }) => navigate(`${baseUrl}/detail?id=${colItem.id}`)
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      valueOf: item => item.name || '-',
      hover: true,
      onClick: ({ colItem }) => navigate(`${baseUrl}/detail?id=${colItem.id}`)
    },
    {
      name: 'type',
      title: formatMessage({ id: 'common.type' }),
      valueOf: item => {
        const type = item.type || 'other';
        return <Tag color={NPM_PACKAGE_TYPE_COLORS[type] || 'default'}>{formatMessage({ id: `shared.catalogMeta.${type}` })}</Tag>;
      }
    },
    {
      name: 'latestVersion',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.latestVersion' }),
      valueOf: item => item.latestVersion || '-'
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      valueOf: item => <Tag color={item.isPublic ? 'success' : 'warning'}>{item.isPublic ? formatMessage({ id: 'common.yes' }) : formatMessage({ id: 'common.no' })}</Tag>
    },
    {
      name: 'description',
      title: formatMessage({ id: 'common.description' }),
      type: 'description',
      ellipsis: true,
      valueOf: item => item.description || '-'
    }
  ];
};

export default getColumns;
