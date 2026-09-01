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
      name: 'projectName',
      title: formatMessage({ id: 'adminWorklog.columns.project' }),
      type: 'text'
    },
    {
      name: 'relativePath',
      title: formatMessage({ id: 'adminWorklog.columns.path' }),
      type: 'text'
    },
    {
      name: 'createdUser',
      title: formatMessage({ id: 'common.creator' }),
      type: 'text',
      valueOf: item => item.createdUser?.nickname || item.createdUser?.email || '-'
    },
    {
      name: 'writtenAt',
      title: formatMessage({ id: 'adminWorklog.columns.writtenAt' }),
      type: 'datetime'
    },
    {
      name: 'updatedAt',
      title: formatMessage({ id: 'common.updatedAt' }),
      type: 'datetime'
    }
  ];
};

export default getColumns;
