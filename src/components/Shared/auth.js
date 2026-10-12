let oidcClient = null;

export const setOidcClient = client => {
  oidcClient = client;
};

export const getUserAccessToken = () => oidcClient?.getTokenSet()?.accessToken || null;

export const hasUserToken = () => !!getUserAccessToken();
