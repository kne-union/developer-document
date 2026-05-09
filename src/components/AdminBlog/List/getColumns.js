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
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      type: 'tag',
      valueOf: item => {
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
      type: 'tag',
      valueOf: item => {
        return item.isPublic ? { type: 'success', text: formatMessage({ id: 'common.public' }) } : { type: 'default', text: formatMessage({ id: 'common.private' }) };
      }
    },
    {
      name: 'groups',
      title: formatMessage({ id: 'adminBlog.getColumns.tags' }),
      type: 'tag',
      valueOf: item => {
        const groups = item.groups || [];
        if (groups.length === 0) return null;
        if (groups.length === 1) return { type: 'default', text: groups[0].name };
        return { type: 'default', text: `${groups[0].name} +${groups.length - 1}` };
      }
    },
    {
      name: 'createdUser',
      title: formatMessage({ id: 'common.creator' }),
      type: 'text',
      valueOf: item => {
        return item.createdUser?.email || '-';
      }
    },
    {
      name: 'publishTime',
      title: formatMessage({ id: 'adminBlog.getColumns.publishTime' }),
      type: 'datetime',
      valueOf: item => {
        return item.publishTime ? item.publishTime : '-';
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
