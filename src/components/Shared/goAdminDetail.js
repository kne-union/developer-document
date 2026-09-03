const resolveAdminRowId = item => {
  const id = item?.id;
  if (id == null || id === '') {
    return null;
  }
  return String(id);
};

export const goAdminDetail = (navigate, colItem, baseUrl) => {
  const id = resolveAdminRowId(colItem);
  if (!id || !navigate) {
    return;
  }
  const query = `detail?id=${encodeURIComponent(id)}`;
  if (baseUrl) {
    navigate(`${String(baseUrl).replace(/\/$/, '')}/${query}`);
    return;
  }
  navigate(query);
};

export const goAdminListBack = ({ navigate, location, baseUrl }) => {
  if (location?.key && location.key !== 'default') {
    navigate(-1);
    return;
  }
  if (baseUrl) {
    navigate(baseUrl);
  }
};

export default goAdminDetail;
