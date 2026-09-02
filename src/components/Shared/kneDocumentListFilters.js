const pickSelectValue = entry => {
  if (entry === undefined || entry === null || entry === '') {
    return undefined;
  }
  if (typeof entry !== 'object') {
    return entry;
  }
  if (Array.isArray(entry.value)) {
    return entry.value[0];
  }
  if (entry.value !== undefined && entry.value !== null && entry.value !== '') {
    return entry.value;
  }
  if (entry.id !== undefined && entry.id !== null && entry.id !== '') {
    return entry.id;
  }
  return undefined;
};

const SELECT_FILTER_KEYS = ['createdUserId', 'category', 'status', 'projectName'];

export const mapKneDocumentListFilterValue = (filterValue, { dateField, dateStartKey, dateEndKey } = {}) => {
  const result = Object.assign({}, filterValue);

  SELECT_FILTER_KEYS.forEach(key => {
    const picked = pickSelectValue(result[key]);
    if (picked !== undefined) {
      result[key] = picked;
    } else {
      delete result[key];
    }
  });

  if (dateField && filterValue[dateField]?.value?.[0] && filterValue[dateField]?.value?.[1]) {
    result[dateStartKey || `${dateField}Start`] = filterValue[dateField].value[0];
    result[dateEndKey || `${dateField}End`] = filterValue[dateField].value[1];
  }
  delete result[dateField];

  const pathValue = filterValue.pathPrefix?.value ?? filterValue.pathPrefix?.code ?? filterValue.pathPrefix;
  if (pathValue) {
    result.pathPrefix = pathValue;
  } else {
    delete result.pathPrefix;
  }

  return result;
};

export const buildPathTreeApis = pathTreeApi =>
  Object.assign({}, pathTreeApi, {
    params: { output: 'tree' }
  });

export const buildProjectNameFilterApi = filterOptionsApi => ({
  ...filterOptionsApi,
  transformData: data => ({
    pageData: (data?.projectNames || []).map(name => ({
      value: name,
      label: name
    }))
  })
});

export const buildUserListFilterApi = getUserListApi => ({
  ...getUserListApi,
  transformData: data => ({
    ...data,
    pageData: (data.pageData || []).map(item => ({
      ...item,
      value: item.id,
      label: item.nickname || item.email || item.phone
    }))
  })
});
