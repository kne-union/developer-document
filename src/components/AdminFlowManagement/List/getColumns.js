import { mapFlowListItem } from './flowListCard';

const enumText = (formatMessage, meta, empty = '-') => {
  if (!meta || meta.empty) return empty;
  return formatMessage({ id: meta.messageId, values: meta.values || {} });
};

const getColumns = ({ navigate, formatMessage, baseUrl }) => [
  {
    name: 'title',
    title: formatMessage({ id: 'adminFlow.columns.title' }),
    renderType: 'main',
    primary: true,
    // TableView 是 24 栅格布局：标题列吃 8 栅格，其余列自动均分剩下的，
    // 不然树形缩进后标题会被挤成两行（Table 渲染时会忽略 span）
    span: 8,
    hover: true,
    // 注意两套渲染器的回调参数语义不同，不能直接 item || colItem：
    // - Table（components-core）：{ colItem: 行数据 }
    // - TableView（@kne/table-view 的 MainCell）：{ item: 单元格值（标题字符串）, colItem: 行数据 }
    // 所以按「哪个是带 id 的对象」来定位行数据，换渲染器都不会点不动
    onClick: ({ colItem, item } = {}) => {
      const row = [colItem, item].find(value => value && typeof value === 'object' && value.id != null);
      if (row) {
        navigate(`${String(baseUrl).replace(/\/$/, '')}/detail/${row.id}`);
      }
    },
    getValueOf: item => item.title || null
  },
  {
    name: 'stage',
    title: formatMessage({ id: 'adminFlow.columns.stage' }),
    renderType: 'tag-short',
    getValueOf: item => ({ type: 'default', text: enumText(formatMessage, mapFlowListItem(item).stage) })
  },
  {
    name: 'status',
    title: formatMessage({ id: 'adminFlow.columns.status' }),
    renderType: 'status',
    getValueOf: item => {
      const mapped = mapFlowListItem(item);
      return { type: mapped.statusColor, text: enumText(formatMessage, mapped.status) };
    }
  },
  {
    name: 'priority',
    title: formatMessage({ id: 'adminFlow.columns.priority' }),
    renderType: 'tag-short',
    getValueOf: item => {
      const mapped = mapFlowListItem(item);
      return { type: mapped.priorityColor, text: enumText(formatMessage, mapped.priority) };
    }
  },
  {
    name: 'ownerUser',
    title: formatMessage({ id: 'adminFlow.columns.owner' }),
    getValueOf: item => item.ownerUser?.nickname || item.ownerUser?.email || item.ownerUserId || null
  },
  {
    name: 'dueAt',
    title: formatMessage({ id: 'adminFlow.columns.dueAt' }),
    format: 'date',
    getValueOf: item => item.dueAt || null
  }
];

export default getColumns;
