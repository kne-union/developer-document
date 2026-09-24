const getApis = options => {
  const { prefix } = Object.assign({}, { prefix: '/api/v1/app-manager' }, options);

  return {
    create: {
      url: `${prefix}/app/create`,
      method: 'POST'
    },
    save: {
      url: `${prefix}/app/save`,
      method: 'POST'
    },
    saveEnv: {
      url: `${prefix}/app/save-env`,
      method: 'POST'
    },
    uploadVersion: {
      url: `${prefix}/app/version/upload`,
      method: 'POST'
    },
    versionList: {
      url: `${prefix}/app/version/list`,
      method: 'GET',
      paramsType: 'params'
    },
    deploy: {
      url: `${prefix}/app/deploy`,
      method: 'POST'
    },
    list: {
      url: `${prefix}/app/list`,
      method: 'GET',
      paramsType: 'params'
    },
    detail: {
      url: `${prefix}/app/detail`,
      method: 'GET',
      paramsType: 'params'
    },
    start: {
      url: `${prefix}/app/start`,
      method: 'POST'
    },
    stop: {
      url: `${prefix}/app/stop`,
      method: 'POST'
    },
    restart: {
      url: `${prefix}/app/restart`,
      method: 'POST'
    },
    remove: {
      url: `${prefix}/app/remove`,
      method: 'POST'
    },
    logs: {
      url: `${prefix}/app/logs`,
      method: 'GET',
      paramsType: 'params'
    },
    logsStream: {
      url: `${prefix}/app/logs/stream`,
      method: 'GET',
      paramsType: 'params'
    },
    dbTables: {
      url: `${prefix}/app/db/tables`,
      method: 'GET',
      paramsType: 'params'
    },
    dbTablesRegister: {
      url: `${prefix}/app/db/tables/register`,
      method: 'POST'
    },
    dbTablesSyncOwned: {
      url: `${prefix}/app/db/tables/sync-owned`,
      method: 'POST'
    },
    dbTablesUnregister: {
      url: `${prefix}/app/db/tables/unregister`,
      method: 'POST'
    },
    dbRows: {
      url: `${prefix}/app/db/rows`,
      method: 'GET',
      paramsType: 'params'
    },
    dbRow: {
      url: `${prefix}/app/db/row`,
      method: 'GET',
      paramsType: 'params'
    },
    dbRowSave: {
      url: `${prefix}/app/db/row/save`,
      method: 'POST'
    },
    dbRowRemove: {
      url: `${prefix}/app/db/row/remove`,
      method: 'POST'
    },
    dbRowRestore: {
      url: `${prefix}/app/db/row/restore`,
      method: 'POST'
    },
    dbQuery: {
      url: `${prefix}/app/db/query`,
      method: 'POST'
    },
    dbExport: {
      url: `${prefix}/app/db/export`,
      method: 'POST'
    },
    dbCleanup: {
      url: `${prefix}/app/db/cleanup`,
      method: 'POST'
    }
  };
};

export default getApis;
