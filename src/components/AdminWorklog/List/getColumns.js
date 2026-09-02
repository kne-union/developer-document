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
      name: 'projectName',
      title: formatMessage({ id: 'adminWorklog.columns.project' }),
      getValueOf: item => item.projectName || item.content?.project?.name || '-'
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
      getValueOf: item => item.createdUser?.nickname || item.createdUser?.email || '-'
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
