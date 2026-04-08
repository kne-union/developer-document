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
    },
    blog: {
      create: {
        url: `${prefix}/blog/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/blog/update`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/blog/delete`,
        method: 'POST'
      },
      detail: {
        url: `${prefix}/blog/detail`,
        method: 'GET'
      },
      list: {
        url: `${prefix}/blog/list`,
        method: 'GET',
        paramsType: 'params'
      },
      publish: {
        url: `${prefix}/blog/publish`,
        method: 'POST'
      },
      unpublish: {
        url: `${prefix}/blog/unpublish`,
        method: 'POST'
      },
      publicList: {
        url: `${prefix}/blog/public/list`,
        method: 'GET',
        paramsType: 'params'
      },
      triggerSearch: {
        url: `${prefix}/task/blog-search`,
        method: 'POST'
      }
    },
    remoteComponent: {
      create: {
        url: `${prefix}/remote-component/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/remote-component/update`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/remote-component/delete`,
        method: 'POST'
      },
      detail: {
        url: `${prefix}/remote-component/detail`,
        method: 'GET'
      },
      list: {
        url: `${prefix}/remote-component/list`,
        method: 'GET',
        paramsType: 'params'
      },
      publicList: {
        url: `${prefix}/remote-component/public/list`,
        method: 'GET',
        paramsType: 'params'
      },
      triggerDeploy: {
        url: `${prefix}/task/remote-component-deploy`,
        method: 'POST'
      }
    },
    npmPackage: {
      create: {
        url: `${prefix}/npm-package/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/npm-package/update`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/npm-package/delete`,
        method: 'POST'
      },
      detail: {
        url: `${prefix}/npm-package/detail`,
        method: 'GET'
      },
      list: {
        url: `${prefix}/npm-package/list`,
        method: 'GET',
        paramsType: 'params'
      },
      publicList: {
        url: `${prefix}/npm-package/public/list`,
        method: 'GET',
        paramsType: 'params'
      },
      types: {
        url: `${prefix}/npm-package/types`,
        method: 'GET'
      },
      triggerSync: {
        url: `${prefix}/task/npm-package-sync`,
        method: 'POST'
      }
    }
  };
};

export default getApis;
