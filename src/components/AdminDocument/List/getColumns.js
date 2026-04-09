const getColumns = ({ navigate, baseUrl }) => {
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
      name: 'name',
      title: '名称',
      type: 'mainInfo',
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'status',
      title: '状态',
      type: 'tag',
      valueOf: item => {
        if (item.status === 'published') {
          return { type: 'success', text: '已发布' };
        }
        if (item.status === 'draft') {
          return { type: 'warning', text: '草稿' };
        }
        return { type: 'default', text: '未知' };
      }
    },
    {
      name: 'isPublic',
      title: '是否公开',
      type: 'tag',
      valueOf: item => {
        return item.isPublic ? { type: 'success', text: '公开' } : { type: 'default', text: '私密' };
      }
    },
    {
      name: 'createdUser',
      title: '创建人',
      type: 'text',
      valueOf: item => {
        return item.createdUser?.email || '-';
      }
    },
    {
      name: 'createdAt',
      title: '创建时间',
      type: 'datetime'
    }
  ];
};

export default getColumns;
