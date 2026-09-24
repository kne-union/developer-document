import { REMOTE_COMPONENT_GROUP_COLORS, REMOTE_COMPONENT_GROUP_LABELS } from '@components/Shared/catalogMeta';
import goAdminDetail from '@components/Shared/goAdminDetail';

const getColumns = ({ navigate, formatMessage }) => {
  return [
    {
      name: 'id',
      title: 'ID',
      width: 80
    },
    {
      name: 'remote',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.componentName' }),
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => item.remote || null
    },
    {
      name: 'name',
      title: formatMessage({ id: 'adminNpmPackage.getColumns.displayName' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => item.name || null
    },
    {
      name: 'group',
      title: formatMessage({ id: 'common.category' }),
      renderType: 'tag',
      getValueOf: item => {
        const group = item.group || 'common';
        const labelId = REMOTE_COMPONENT_GROUP_LABELS[group] || `shared.catalogMeta.${group}`;
        return {
          type: REMOTE_COMPONENT_GROUP_COLORS[group] || 'default',
          text: formatMessage({ id: labelId, defaultMessage: group })
        };
      }
    },
    {
      name: 'packageName',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.npmPackageName' }),
      getValueOf: item => item.packageName || null
    },
    {
      name: 'registry',
      title: 'NPM Registry',
      getValueOf: item => item.registry || null
    },
    {
      name: 'defaultVersion',
      title: formatMessage({ id: 'adminRemoteComponent.getColumns.deployedVersions' }),
      getValueOf: item => item.defaultVersion || null
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
