const resolveAdminRowId = item => {
  const id = item?.id;
  if (id == null || id === '') {
    return null;
  }
  return String(id);
};

export const goAdminDetail = (navigate, colItem) => {
  const id = resolveAdminRowId(colItem);
  if (!id || !navigate) {
    return;
  }
  navigate(`detail?id=${encodeURIComponent(id)}`);
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
