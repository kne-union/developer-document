import goAdminDetail from '@components/Shared/goAdminDetail';

const TYPE_COLOR = {
  rule: 'purple',
  skill: 'blue'
};

const getColumns = ({ navigate, formatMessage, baseUrl }) => {
  return [
    {
      name: 'name',
      title: formatMessage({ id: 'adminSkill.columns.name' }),
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        goAdminDetail(navigate, colItem, baseUrl);
      },
      getValueOf: item => item.title || item.name || null
    },
    {
      name: 'type',
      title: formatMessage({ id: 'adminSkill.columns.type' }),
      renderType: 'tag',
      getValueOf: item => ({
        type: TYPE_COLOR[item.type] || 'default',
        text: formatMessage({ id: `adminSkill.type.${item.type}`, defaultMessage: item.type })
      })
    },
    {
      name: 'description',
      title: formatMessage({ id: 'adminSkill.columns.description' }),
      renderType: 'description',
      ellipsis: true
    },
    {
      name: 'category',
      title: formatMessage({ id: 'adminSkill.columns.category' }),
      getValueOf: item => (item.category ? formatMessage({ id: `adminSkill.category.${item.category}`, defaultMessage: item.category }) : null)
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      renderType: 'tag',
      getValueOf: item => {
        if (item.status === 'active') {
          return { type: 'success', text: formatMessage({ id: 'adminSkill.status.active' }) };
        }
        if (item.status === 'closed') {
          return { type: 'default', text: formatMessage({ id: 'adminSkill.status.closed' }) };
        }
        return { type: 'default', text: item.status };
      }
    },
    {
      name: 'source',
      title: formatMessage({ id: 'adminSkill.columns.source' }),
      getValueOf: item => item.source || null
    },
    {
      name: 'updatedAt',
      title: formatMessage({ id: 'common.updatedAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
