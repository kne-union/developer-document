/**
 * 流程列表卡片/移动端呈现的可测试映射。只读已有字段，不编造进度等列表接口没有的数据。
 * 状态/阶段/优先级走项目已有枚举 i18n，未知值给明确 unknown，不把原始 code 当标签。
 */
const FLOW_STATUS_CODES = Object.freeze(['draft', 'active', 'completed', 'archived']);
const FLOW_PRIORITY_CODES = Object.freeze(['low', 'medium', 'high', 'urgent']);
const STAGE_CODES = Object.freeze(['requirement', 'product_design', 'development', 'testing', 'pre_release']);

const STATUS_COLOR = Object.freeze({
  draft: 'default',
  active: 'processing',
  completed: 'success',
  archived: 'default'
});

const PRIORITY_COLOR = Object.freeze({
  low: 'default',
  medium: 'processing',
  high: 'warning',
  urgent: 'error'
});

function toCamel(code) {
  return String(code || '').replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());
}

function resolveCodedLabel(code, knownCodes, messageIdForKnown, unknownMessageId) {
  const value = code == null ? '' : String(code).trim();
  if (!value) {
    return { empty: true, known: false, code: '', messageId: '', values: {} };
  }
  if (knownCodes.indexOf(value) !== -1) {
    return { empty: false, known: true, code: value, messageId: messageIdForKnown(value), values: {} };
  }
  return { empty: false, known: false, code: value, messageId: unknownMessageId, values: { code: value } };
}

function formatOwner(item) {
  if (!item) return '';
  const user = item.ownerUser;
  if (user && typeof user === 'object') {
    return user.nickname || user.email || user.phone || '';
  }
  return item.ownerUserId ? String(item.ownerUserId) : '';
}

function mapFlowListItem(item) {
  if (!item || typeof item !== 'object') {
    return {
      empty: true,
      id: '',
      title: '',
      code: '',
      owner: '',
      dueAt: null,
      stayMinutes: null,
      parentId: null,
      status: resolveCodedLabel('', FLOW_STATUS_CODES, () => '', ''),
      stage: resolveCodedLabel('', STAGE_CODES, () => '', ''),
      priority: resolveCodedLabel('', FLOW_PRIORITY_CODES, () => '', ''),
      statusColor: 'default',
      priorityColor: 'default'
    };
  }
  const status = resolveCodedLabel(item.status, FLOW_STATUS_CODES, value => 'adminFlow.status.' + value, 'adminFlow.status.unknown');
  const stage = resolveCodedLabel(item.stage, STAGE_CODES, value => 'adminFlow.stage.' + toCamel(value), 'adminFlow.stage.unknown');
  const priority = resolveCodedLabel(item.priority, FLOW_PRIORITY_CODES, value => 'adminFlow.priority.' + value, 'adminFlow.priority.unknown');
  return {
    empty: false,
    id: item.id == null ? '' : item.id,
    title: item.title ? String(item.title) : '',
    code: item.code ? String(item.code) : '',
    status,
    statusColor: status.known ? STATUS_COLOR[status.code] || 'default' : 'default',
    stage,
    priority,
    priorityColor: priority.known ? PRIORITY_COLOR[priority.code] || 'default' : 'default',
    owner: formatOwner(item),
    dueAt: item.dueAt || null,
    stayMinutes: typeof item.stayMinutes === 'number' ? item.stayMinutes : null,
    parentId: item.parentId == null ? null : item.parentId
  };
}

function isOptionsColumn(column) {
  return !!(column && (column.name === 'options' || column.renderType === 'options'));
}

function collectCardActions(columns, item) {
  const optionsColumn = Array.isArray(columns) ? columns.find(isOptionsColumn) : null;
  if (!optionsColumn || typeof optionsColumn.getValueOf !== 'function') {
    return { present: false, value: null };
  }
  return { present: true, value: optionsColumn.getValueOf(item, { place: 'end' }) };
}

function detailPath(baseUrl, id) {
  if (id == null || id === '') return '';
  const root = String(baseUrl || '').replace(/\/$/, '');
  return root + '/detail/' + id;
}

function listFromTableProps(tableProps) {
  const props = tableProps || {};
  if (Array.isArray(props.displayDataSource)) return props.displayDataSource;
  if (Array.isArray(props.dataSource)) return props.dataSource;
  return [];
}

module.exports = {
  FLOW_STATUS_CODES,
  FLOW_PRIORITY_CODES,
  STAGE_CODES,
  mapFlowListItem,
  collectCardActions,
  isOptionsColumn,
  detailPath,
  listFromTableProps,
  formatOwner
};
