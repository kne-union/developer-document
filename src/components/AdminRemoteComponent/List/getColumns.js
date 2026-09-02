import { Tag } from 'antd';
import { REMOTE_COMPONENT_GROUP_COLORS } from '@components/Shared/catalogMeta';
import goAdminDetail from '@components/Shared/goAdminDetail';

const getColumns = ({ navigate, formatMessage }) => {
  return [
    {
      name: 'id',
      title: 'ID',
      width: 80,
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      }
    },
    {
      name: 'remote',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.componentName' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      }
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      getValueOf: item => item.name || '-'
    },
    {
      name: 'group',
      title: formatMessage({ id: 'common.category' }),
      render: (_, { dataSource }) => {
        const group = dataSource.group || 'common';
        return <Tag color={REMOTE_COMPONENT_GROUP_COLORS[group] || 'default'}>{formatMessage({ id: `shared.catalogMeta.${group}` })}</Tag>;
      }
    },
    {
      name: 'packageName',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.npmPackageName' }),
      getValueOf: item => item.packageName || '-'
    },
    {
      name: 'registry',
      title: 'NPM Registry',
      getValueOf: item => item.registry || '-'
    },
    {
      name: 'defaultVersion',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.deployedVersions' }),
      getValueOf: item => item.defaultVersion || '-'
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      renderType: 'tag',
      getValueOf: item => (item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.public' }) } : { type: 'default', text: formatMessage({ id: 'common.private' }) })
    },
    {
      name: 'examples',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.deployedVersions' }),
      renderType: 'tagList',
      getValueOf: item => {
        const examples = item.examples || [];
        if (examples.length === 0) {
          return null;
        }
        return examples.map(version => ({ type: 'default', text: version }));
      }
    },
    {
      name: 'createdAt',
      title: formatMessage({ id: 'common.createdAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
