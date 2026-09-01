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
      name: 'title',
      title: formatMessage({ id: 'common.title' }),
      type: 'mainInfo',
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'relativePath',
      title: formatMessage({ id: 'adminExperience.columns.path' }),
      type: 'text'
    },
    {
      name: 'category',
      title: formatMessage({ id: 'adminExperience.columns.category' }),
      type: 'text'
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      type: 'tag',
      valueOf: item => {
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
      type: 'text',
      valueOf: item => item.createdUser?.email || item.createdUser?.nickname || '-'
    },
    {
      name: 'updatedAt',
      title: formatMessage({ id: 'common.updatedAt' }),
      type: 'datetime'
    }
  ];
};

export default getColumns;
