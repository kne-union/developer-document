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
      name: 'title',
      title: formatMessage({ id: 'common.title' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      }
    },
    {
      name: 'relativePath',
      title: formatMessage({ id: 'adminExperience.columns.path' }),
      renderType: 'description',
      ellipsis: true
    },
    {
      name: 'category',
      title: formatMessage({ id: 'adminExperience.columns.category' })
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      renderType: 'tag',
      getValueOf: item => {
        if (item.status === 'active') {
          return { type: 'success', text: formatMessage({ id: 'adminExperience.status.active' }) };
        }
        if (item.status === 'closed') {
          return { type: 'default', text: formatMessage({ id: 'adminExperience.status.closed' }) };
        }
        return { type: 'default', text: item.status };
      }
    },
    {
      name: 'createdUser',
      title: formatMessage({ id: 'common.creator' }),
      getValueOf: item => item.createdUser?.email || item.createdUser?.nickname || '-'
    },
    {
      name: 'updatedAt',
      title: formatMessage({ id: 'common.updatedAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
