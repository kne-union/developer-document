export const hasUserToken = () => {
  try {
    return !!localStorage.getItem('X-User-Token');
  } catch (error) {
    return false;
  }
};
