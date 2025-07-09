const getApis = options => {
  const { prefix } = Object.assign({}, { prefix: '/api/v1' }, options);

  return {
    setting: {
      saveOrCreate: {
        url: `${prefix}/setting/saveOrCreate`,
        method: 'POST'
      },
      detail: {
        url: `${prefix}/setting/detail`,
        method: 'GET'
      }
    }
  };
};

export default getApis;
