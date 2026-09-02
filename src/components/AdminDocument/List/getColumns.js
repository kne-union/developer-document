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
      name: 'name',
      title: formatMessage({ id: 'common.name' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      }
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      renderType: 'tag',
      getValueOf: item => {
        if (item.status === 'published') {
          return { type: 'success', text: formatMessage({ id: 'common.published' }) };
        }
        if (item.status === 'draft') {
          return { type: 'warning', text: formatMessage({ id: 'common.draft' }) };
        }
        return { type: 'default', text: formatMessage({ id: 'common.unknown' }) };
      }
    },
    {
      name: 'isPublic',
      title: formatMessage({ id: 'common.isPublic' }),
      renderType: 'tag',
      getValueOf: item => (item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.public' }) } : { type: 'default', text: formatMessage({ id: 'common.private' }) })
    },
    {
      name: 'groups',
      title: formatMessage({ id: 'adminDocument.getColumns.folder' }),
      renderType: 'tag',
      getValueOf: item => {
        const groups = item.groups || [];
        if (groups.length === 0) {
          return null;
        }
        if (groups.length === 1) {
          return { type: 'default', text: groups[0].name };
        }
        return { type: 'default', text: `${groups[0].name} +${groups.length - 1}` };
      }
    },
    {
      name: 'createdUser',
      title: formatMessage({ id: 'common.creator' }),
      getValueOf: item => item.createdUser?.email || '-'
    },
    {
      name: 'createdAt',
      title: formatMessage({ id: 'common.createdAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
