import { Tag, Space } from 'antd';
import { REMOTE_COMPONENT_GROUP_COLORS } from '@components/Shared/catalogMeta';

const getColumns = ({ navigate, baseUrl, formatMessage }) => {
  return [
    {
      name: 'id',
      title: 'ID',
      type: 'serialNumber',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'remote',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.componentName' }),
      type: 'mainInfo',
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      type: 'text',
      valueOf: item => {
        return item.name || '-';
      }
    },
    {
      name: 'group',
      title: formatMessage({ id: 'common.category' }),
      valueOf: item => {
        const group = item.group || 'common';
        return <Tag color={REMOTE_COMPONENT_GROUP_COLORS[group] || 'default'}>{formatMessage({ id: `shared.catalogMeta.${group}` })}</Tag>;
      }
    },
    {
      name: 'packageName',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.npmPackageName' }),
      type: 'text',
      valueOf: item => {
        return item.packageName || '-';
      }
    },
    {
      name: 'registry',
      title: 'NPM Registry',
      type: 'text',
      valueOf: item => {
        return item.registry || '-';
      }
    },
    {
      name: 'defaultVersion',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.deployedVersions' }),
      type: 'text',
      valueOf: item => {
        return item.defaultVersion || '-';
      }
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      type: 'tag',
      valueOf: item => {
        return item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.public' }) } : { type: 'default', text: formatMessage({ id: 'common.private' }) };
      }
    },
    {
      name: 'examples',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.deployedVersions' }),
      valueOf: item => {
        const examples = item.examples || [];
        if (examples.length === 0) return '-';
        return (
          <Space size={[4, 4]} wrap>
            {examples.map(version => (
              <Tag key={version}>{version}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      name: 'createdAt',
      title: formatMessage({ id: 'common.createdAt' }),
      type: 'datetime'
    }
  ];
};

export default getColumns;
