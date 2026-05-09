const toMetaMap = (options, key) => {
  return options.reduce((result, item) => {
    result[item.value] = item[key];
    return result;
  }, {});
};

export const NPM_PACKAGE_TYPE_OPTIONS = [
  { value: 'frontend', label: 'shared.catalogMeta.frontend', color: 'blue' },
  { value: 'nodejs', label: 'shared.catalogMeta.nodejs', color: 'green' },
  { value: 'engineering', label: 'shared.catalogMeta.engineering', color: 'orange' },
  { value: 'miniprogram', label: 'shared.catalogMeta.miniprogram', color: 'cyan' },
  { value: 'prompts', label: 'shared.catalogMeta.prompts', color: 'purple' },
  { value: 'other', label: 'shared.catalogMeta.other', color: 'default' }
];

export const NPM_PACKAGE_TYPE_ORDER = NPM_PACKAGE_TYPE_OPTIONS.map(item => item.value);
export const NPM_PACKAGE_TYPE_LABELS = toMetaMap(NPM_PACKAGE_TYPE_OPTIONS, 'label');
export const NPM_PACKAGE_TYPE_COLORS = toMetaMap(NPM_PACKAGE_TYPE_OPTIONS, 'color');

export const REMOTE_COMPONENT_GROUP_OPTIONS = [
  { value: 'business', label: 'shared.catalogMeta.business', color: 'blue' },
  { value: 'common', label: 'shared.catalogMeta.common', color: 'green' }
];

export const REMOTE_COMPONENT_GROUP_ORDER = REMOTE_COMPONENT_GROUP_OPTIONS.map(item => item.value);
export const REMOTE_COMPONENT_GROUP_LABELS = toMetaMap(REMOTE_COMPONENT_GROUP_OPTIONS, 'label');
export const REMOTE_COMPONENT_GROUP_COLORS = toMetaMap(REMOTE_COMPONENT_GROUP_OPTIONS, 'color');
