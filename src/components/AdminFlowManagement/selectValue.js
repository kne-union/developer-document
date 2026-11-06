// SuperSelect 值契约（依据经验：SuperSelect object-output-value 编辑回显需带 label）
// 组件内部持有完整选项对象 { value, label, id }，服务端只存 code。
// - 提交：字段加 interceptor="object-output-value"，由 components-core FormInfo 的 preset
//   取 value.value || value.id，输出 code（多选输出 code 数组）。
// - 回显：formProps.data 里必须把 code 还原成带 label 的完整选项对象，
//   只塞裸 id / 裸字符串会匹配不到选项，下拉显示为空。
// 不要只做一侧：只加拦截器会丢名称，只转回显会提交对象给后端。

export const toSelectOption = (value, options = []) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return value;
  const code = String(value);
  const matched = options.find(item => String(item.value) === code);
  return { value: code, label: matched?.label || code, id: code };
};

// 兜底：万一拦截器没覆盖到（例如嵌套 TableList 字段 / 多选数组），
// 提交前把选项对象收敛成 code，避免把 {value,label} 直接发给服务端 schema。
export const selectValueOf = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.value ?? value.id;
  return value;
};

export const selectValuesOf = values => (Array.isArray(values) ? values : []).map(selectValueOf).filter(item => item !== undefined && item !== null && item !== '');

// Filter 的 SuperSelectFilterItem 输出的是 { value, label }（或 { value: [...] }），
// 发给后端前必须提取 code。口径与 Shared/kneDocumentListFilters.js 的 pickSelectValue 一致。
export const pickSelectFilterValue = entry => {
  if (entry === undefined || entry === null || entry === '') return undefined;
  if (typeof entry !== 'object') return entry;
  if (Array.isArray(entry.value)) return entry.value[0];
  if (entry.value !== undefined && entry.value !== null && entry.value !== '') return entry.value;
  if (entry.id !== undefined && entry.id !== null && entry.id !== '') return entry.id;
  return undefined;
};
