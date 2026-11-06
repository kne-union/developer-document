// SuperSelect 值契约：组件内部持有完整选项对象 { value, label, id }，服务端只存 code。
// - 提交：字段加 interceptor="object-output-value"，输出 code。
// - 回显：formProps.data 里必须把 code 还原成带 label 的完整选项对象，否则下拉显示为空。
export const toSelectOption = (value, options = []) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return value;
  const code = String(value);
  const matched = options.find(item => String(item.value) === code);
  return { value: code, label: matched?.label || code, id: code };
};

// Filter 的 SuperSelectFilterItem 输出 { value, label }（或多选 { value: [...] }），
// 发给后端前必须提取 code。
export const pickSelectFilterValue = entry => {
  if (entry === undefined || entry === null || entry === '') return undefined;
  if (typeof entry !== 'object') return entry;
  if (Array.isArray(entry.value)) return entry.value[0];
  if (entry.value !== undefined && entry.value !== null && entry.value !== '') return entry.value;
  if (entry.id !== undefined && entry.id !== null && entry.id !== '') return entry.id;
  return undefined;
};
