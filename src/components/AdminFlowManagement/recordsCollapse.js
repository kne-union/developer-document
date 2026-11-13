/**
 * 详情页底部记录折叠的默认展开：有待处理打回意见时自动打开「操作记录」。
 * 只描述展开行为，不改数据。
 */
function recordsDefaultActiveKey(openFeedback) {
  return Array.isArray(openFeedback) && openFeedback.length > 0 ? ['release'] : [];
}

const RECORDS_PANEL_KEYS = Object.freeze(['records', 'tree', 'ai', 'release']);

module.exports = { recordsDefaultActiveKey, RECORDS_PANEL_KEYS };
