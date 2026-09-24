import goAdminDetail from '@components/Shared/goAdminDetail';

const getColumns = ({ navigate, formatMessage }) => {
  return [
    {
      name: 'id',
      title: 'ID',
      width: 80
    },
    {
      name: 'title',
      title: formatMessage({ id: 'common.title' }),
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem);
      },
      getValueOf: item => item.title || null
    },
    {
      name: 'projectName',
      title: formatMessage({ id: 'adminWorklog.columns.project' }),
      getValueOf: item => item.projectName || item.content?.project?.name || null
    },
    {
      name: 'relativePath',
      title: formatMessage({ id: 'adminWorklog.columns.path' }),
      renderType: 'description',
      ellipsis: true
    },
    {
      name: 'createdUser',
      title: formatMessage({ id: 'common.creator' }),
      getValueOf: item => item.createdUser?.nickname || item.createdUser?.email || null
    },
    {
      name: 'writtenAt',
      title: formatMessage({ id: 'adminWorklog.columns.writtenAt' }),
      format: 'datetime'
    },
    {
      name: 'updatedAt',
      title: formatMessage({ id: 'common.updatedAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
