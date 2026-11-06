const getApis = options => {
  const { prefix } = Object.assign({}, { prefix: '/api/v1' }, options);

  return {
    tenantApps: {
      list: {
        url: '/api/oidc/tenant/apps',
        method: 'GET'
      }
    },
    devToken: {
      issue: {
        url: `${prefix}/dev-token/issue`,
        method: 'POST'
      }
    },
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
    blogLead: {
      list: {
        url: `${prefix}/blog-lead/list`,
        method: 'GET',
        paramsType: 'params'
      },
      detail: {
        url: `${prefix}/blog-lead/detail`,
        method: 'GET'
      },
      update: {
        url: `${prefix}/blog-lead/update`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/blog-lead/delete`,
        method: 'POST'
      },
      batchDelete: {
        url: `${prefix}/blog-lead/batch-delete`,
        method: 'POST'
      },
      complete: {
        url: `${prefix}/blog-lead/complete`,
        method: 'POST'
      },
      settings: {
        url: `${prefix}/blog-lead/settings`,
        method: 'GET'
      },
      saveSettings: {
        url: `${prefix}/blog-lead/settings`,
        method: 'POST'
      },
      fetch: {
        url: `${prefix}/blog-lead/fetch`,
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
    },
    document: {
      create: {
        url: `${prefix}/document/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/document/update`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/document/delete`,
        method: 'POST'
      },
      detail: {
        url: `${prefix}/document/detail`,
        method: 'GET'
      },
      list: {
        url: `${prefix}/document/list`,
        method: 'GET',
        paramsType: 'params'
      },
      publish: {
        url: `${prefix}/document/publish`,
        method: 'POST'
      },
      unpublish: {
        url: `${prefix}/document/unpublish`,
        method: 'POST'
      },
      publicList: {
        url: `${prefix}/document/public/list`,
        method: 'GET',
        paramsType: 'params'
      },
      search: {
        url: `${prefix}/document/search`,
        method: 'GET',
        paramsType: 'params'
      }
    },
    group: {
      create: {
        url: `${prefix}/group/save`,
        method: 'POST'
      },
      list: {
        url: `${prefix}/group/list`,
        method: 'GET'
      },
      groupList: {
        url: `${prefix}/group/group-list`,
        method: 'GET'
      },
      save: {
        url: `${prefix}/group/save`,
        method: 'POST'
      },
      remove: {
        url: `${prefix}/group/remove`,
        method: 'POST'
      }
    },
    experience: {
      list: {
        url: `${prefix}/experience/manage/list`,
        method: 'GET',
        paramsType: 'params'
      },
      pathTree: {
        url: `${prefix}/experience/manage/path-tree`,
        method: 'GET'
      },
      filterOptions: {
        url: `${prefix}/experience/manage/filter-options`,
        method: 'GET'
      },
      detail: {
        url: `${prefix}/experience/manage/detail`,
        method: 'GET'
      },
      close: {
        url: `${prefix}/experience/manage/close`,
        method: 'POST'
      },
      reopen: {
        url: `${prefix}/experience/manage/reopen`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/experience/manage/delete`,
        method: 'POST'
      },
      export: {
        url: `${prefix}/experience/manage/export`,
        method: 'GET'
      },
      import: {
        url: `${prefix}/experience/manage/import`,
        method: 'POST'
      },
      upload: {
        url: `${prefix}/experience/upload`,
        method: 'POST'
      },
      exists: {
        url: `${prefix}/experience/exists`,
        method: 'GET'
      },
      search: {
        url: `${prefix}/experience/search`,
        method: 'GET',
        paramsType: 'params'
      }
    },
    skill: {
      list: {
        url: `${prefix}/skill/manage/list`,
        method: 'GET',
        paramsType: 'params'
      },
      detail: {
        url: `${prefix}/skill/manage/detail`,
        method: 'GET'
      },
      create: {
        url: `${prefix}/skill/manage/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/skill/manage/update`,
        method: 'POST'
      },
      close: {
        url: `${prefix}/skill/manage/close`,
        method: 'POST'
      },
      reopen: {
        url: `${prefix}/skill/manage/reopen`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/skill/manage/delete`,
        method: 'POST'
      },
      search: {
        url: `${prefix}/skill/search`,
        method: 'GET',
        paramsType: 'params'
      },
      upload: {
        url: `${prefix}/skill/upload`,
        method: 'POST'
      },
      export: {
        url: `${prefix}/skill/export`,
        method: 'GET',
        paramsType: 'params'
      }
    },
    worklog: {
      list: {
        url: `${prefix}/worklog/manage/list`,
        method: 'GET',
        paramsType: 'params'
      },
      pathTree: {
        url: `${prefix}/worklog/manage/path-tree`,
        method: 'GET'
      },
      filterOptions: {
        url: `${prefix}/worklog/manage/filter-options`,
        method: 'GET'
      },
      detail: {
        url: `${prefix}/worklog/manage/detail`,
        method: 'GET'
      },
      resolve: {
        url: `${prefix}/worklog/manage/resolve`,
        method: 'POST'
      },
      export: {
        url: `${prefix}/worklog/manage/export`,
        method: 'GET'
      },
      import: {
        url: `${prefix}/worklog/manage/import`,
        method: 'POST'
      },
      upload: {
        url: `${prefix}/worklog/upload`,
        method: 'POST'
      },
      exists: {
        url: `${prefix}/worklog/exists`,
        method: 'GET'
      }
    },
    documentIndex: {
      search: {
        url: `${prefix}/document-index/search`,
        method: 'GET',
        paramsType: 'params'
      }
    },
    searchAnalytics: {
      records: {
        url: `${prefix}/search-analytics/records`,
        method: 'GET',
        paramsType: 'params'
      },
      summary: {
        url: `${prefix}/search-analytics/summary`,
        method: 'GET',
        paramsType: 'params'
      },
      trend: {
        url: `${prefix}/search-analytics/trend`,
        method: 'GET',
        paramsType: 'params'
      },
      topQueries: {
        url: `${prefix}/search-analytics/top-queries`,
        method: 'GET',
        paramsType: 'params'
      }
    },
    // 流程管理：人机共用同一套 REST 接口；GET 带参接口统一 paramsType: 'params'
    flow: {
      list: {
        url: `${prefix}/flow/list`,
        method: 'GET',
        paramsType: 'params'
      },
      detail: {
        url: `${prefix}/flow/detail`,
        method: 'GET',
        paramsType: 'params'
      },
      stages: {
        url: `${prefix}/flow/stages`,
        method: 'GET',
        paramsType: 'params'
      },
      stageRecords: {
        url: `${prefix}/flow/stage-records`,
        method: 'GET',
        paramsType: 'params'
      },
      summary: {
        url: `${prefix}/flow/summary`,
        method: 'GET',
        paramsType: 'params'
      },
      tree: {
        url: `${prefix}/flow/tree`,
        method: 'GET',
        paramsType: 'params'
      },
      templates: {
        url: `${prefix}/flow/deliverable/templates`,
        method: 'GET',
        paramsType: 'params'
      },
      deliverables: {
        url: `${prefix}/flow/deliverable/list`,
        method: 'GET',
        paramsType: 'params'
      },
      deliverableCheck: {
        url: `${prefix}/flow/deliverable/check`,
        method: 'GET',
        paramsType: 'params'
      },
      confirmationList: {
        url: `${prefix}/flow/confirmation/list`,
        method: 'GET',
        paramsType: 'params'
      },
      queuePeek: {
        url: `${prefix}/flow/queue/peek`,
        method: 'GET',
        paramsType: 'params'
      },
      releaseList: {
        url: `${prefix}/flow/release/list`,
        method: 'GET',
        paramsType: 'params'
      },
      runDetail: {
        url: `${prefix}/flow/run/detail`,
        method: 'GET',
        paramsType: 'params'
      },
      create: {
        url: `${prefix}/flow/create`,
        method: 'POST'
      },
      update: {
        url: `${prefix}/flow/update`,
        method: 'POST'
      },
      archive: {
        url: `${prefix}/flow/archive`,
        method: 'POST'
      },
      delete: {
        url: `${prefix}/flow/delete`,
        method: 'POST'
      },
      transition: {
        url: `${prefix}/flow/transition`,
        method: 'POST'
      },
      decomposePropose: {
        url: `${prefix}/flow/decompose/propose`,
        method: 'POST'
      },
      decomposeApply: {
        url: `${prefix}/flow/decompose/apply`,
        method: 'POST'
      },
      confirmationAnswer: {
        url: `${prefix}/flow/confirmation/answer`,
        method: 'POST'
      },
      confirmationCancel: {
        url: `${prefix}/flow/confirmation/cancel`,
        method: 'POST'
      },
      pause: {
        url: `${prefix}/flow/pause`,
        method: 'POST'
      },
      resume: {
        url: `${prefix}/flow/resume`,
        method: 'POST'
      },
      deliverableSave: {
        url: `${prefix}/flow/deliverable/save`,
        method: 'POST'
      },
      deliverableSubmit: {
        url: `${prefix}/flow/deliverable/submit`,
        method: 'POST'
      },
      deliverableReview: {
        url: `${prefix}/flow/deliverable/review`,
        method: 'POST'
      },
      deliverableWaive: {
        url: `${prefix}/flow/deliverable/waive`,
        method: 'POST'
      },
      releaseUndo: {
        url: `${prefix}/flow/release/undo`,
        method: 'POST'
      }
    }
  };
};

export default getApis;
