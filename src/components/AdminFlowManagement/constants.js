// 流程管理共享常量：阶段 / 状态 / 优先级 / 交付物状态等代码枚举与 i18n key 映射
// 注意：阶段与交付物模板的权威定义在服务端，前端只保留展示用的顺序与颜色

// 五阶段固定顺序（与服务端 STAGE_CODES 一致）
export const STAGE_CODES = ['requirement', 'product_design', 'development', 'testing', 'pre_release'];

// 阶段展示色（用于阶段条 / tag）
export const STAGE_COLOR = {
  requirement: 'blue',
  product_design: 'purple',
  development: 'cyan',
  testing: 'orange',
  pre_release: 'gold'
};

// 流程实例状态
export const STATUS_CODES = ['draft', 'active', 'completed', 'archived'];
export const STATUS_COLOR = {
  draft: 'default',
  active: 'processing',
  completed: 'success',
  archived: 'default'
};

// 优先级
export const PRIORITY_CODES = ['low', 'medium', 'high', 'urgent'];
// 值必须是 TablePage tag 列认识的类型，不用 antd 颜色名
export const PRIORITY_COLOR = {
  low: 'default',
  medium: 'processing',
  high: 'warning',
  urgent: 'error'
};

// 交付物状态（含 ai_draft）
export const DELIVERABLE_STATUS_CODES = ['pending', 'ai_draft', 'submitted', 'accepted', 'rejected', 'waived'];
// 值必须是 TablePage status 列认识的类型，不用自定义颜色名
export const DELIVERABLE_STATUS_COLOR = {
  pending: 'default',
  ai_draft: 'warning',
  submitted: 'processing',
  accepted: 'success',
  rejected: 'error',
  waived: 'default'
};

// 来源（双生产者）
export const PRODUCED_BY_CODES = ['human', 'ai', 'hybrid'];

// contentType → 展示文案 key
export const CONTENT_TYPE_CODES = ['file', 'url', 'text', 'checklist', 'jsonb'];

// 队列「已排除」原因
export const EXCLUSION_REASONS = ['paused', 'paused_ancestor', 'awaiting_human'];

// 确认状态
export const CONFIRM_STATUS_CODES = ['pending', 'approved', 'rejected', 'changes_requested', 'expired', 'cancelled', 'superseded'];

// snake_case → camelCase（用于拼接 i18n key，如 product_design → productDesign）
export const toCamel = code => String(code || '').replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());

// 阶段 code → i18n key
export const stageMessageId = code => `adminFlow.stage.${toCamel(code)}`;
// 状态 code → i18n key
export const statusMessageId = code => `adminFlow.status.${code}`;
// 优先级 code → i18n key
export const priorityMessageId = code => `adminFlow.priority.${code}`;
// 交付物状态 code → i18n key
export const deliverableStatusMessageId = code => `adminFlow.deliverable.status.${toCamel(code)}`;
// 来源 code → i18n key
export const producedByMessageId = code => `adminFlow.deliverable.producedBy.${code}`;
// contentType → i18n key
export const contentTypeMessageId = code => `adminFlow.deliverable.contentType.${code}`;
// 交付物模板 code → 名称 / 验收要点 i18n key
export const templateNameId = code => `adminFlow.deliverableTemplate.${toCamel(code)}.name`;
export const templateCriteriaId = code => `adminFlow.deliverableTemplate.${toCamel(code)}.criteria`;
// 流转记录 action → i18n key
export const stageRecordActionId = action => `adminFlow.detail.action.${action}`;
// 确认状态 → i18n key
export const confirmStatusMessageId = code => `adminFlow.confirm.status.${toCamel(code)}`;
// 队列目标 → i18n key
export const queueGoalMessageId = code => `adminFlow.queue.goal.${toCamel(code)}`;
// 队列排除原因 → i18n key
export const exclusionReasonMessageId = code => `adminFlow.queue.reason.${toCamel(code)}`;
