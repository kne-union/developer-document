const toMetaMap = (options, key) => {
  return options.reduce((result, item) => {
    result[item.value] = item[key];
    return result;
  }, {});
};

export const NPM_PACKAGE_TYPE_OPTIONS = [
  { value: 'frontend', label: '前端组件', color: 'blue' },
  { value: 'nodejs', label: 'NodeJS', color: 'green' },
  { value: 'engineering', label: '工程化', color: 'orange' },
  { value: 'miniprogram', label: '小程序', color: 'cyan' },
  { value: 'prompts', label: 'Prompts', color: 'purple' },
  { value: 'other', label: '其他', color: 'default' }
];

export const NPM_PACKAGE_TYPE_ORDER = NPM_PACKAGE_TYPE_OPTIONS.map(item => item.value);
export const NPM_PACKAGE_TYPE_LABELS = toMetaMap(NPM_PACKAGE_TYPE_OPTIONS, 'label');
export const NPM_PACKAGE_TYPE_COLORS = toMetaMap(NPM_PACKAGE_TYPE_OPTIONS, 'color');

export const REMOTE_COMPONENT_GROUP_OPTIONS = [
  { value: 'business', label: '业务', color: 'blue' },
  { value: 'common', label: '通用', color: 'green' }
];

export const REMOTE_COMPONENT_GROUP_ORDER = REMOTE_COMPONENT_GROUP_OPTIONS.map(item => item.value);
export const REMOTE_COMPONENT_GROUP_LABELS = toMetaMap(REMOTE_COMPONENT_GROUP_OPTIONS, 'label');
export const REMOTE_COMPONENT_GROUP_COLORS = toMetaMap(REMOTE_COMPONENT_GROUP_OPTIONS, 'color');
