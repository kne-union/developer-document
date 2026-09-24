/**
 * Host wrapper for @kne/fastify-app-manager.
 * Skip re-registering multipart / reply-from when already present on the host.
 */
const fp = require('fastify-plugin');
const path = require('node:path');
const { assertDefaultAppDbSeparated } = require('@kne/fastify-app-manager/libs/utils/dbIdentity');

const pkgRoot = path.dirname(require.resolve('@kne/fastify-app-manager'));

module.exports = fp(
  async (fastify, options) => {
    options = Object.assign(
      {},
      {
        dbTableNamePrefix: 't_app_manager_',
        name: 'appManager',
        prefix: '/api/v1/app-manager',
        appsRoot: path.join(process.cwd(), 'managed-apps'),
        portMin: 4000,
        portMax: 7999,
        pathPrefix: '/app',
        healthCheckPath: '/',
        healthCheckTimeoutMs: 30000,
        healthCheckIntervalMs: 1000,
        maxZipSize: 200 * 1024 * 1024,
        maxZipEntries: 20000,
        npmInstallTimeoutMs: 10 * 60 * 1000,
        logRetentionMaxRows: 10000,
        sseReplayLines: 100,
        sseHeartbeatMs: 15000,
        logMaxSize: 50 * 1024 * 1024,
        passthroughEnvKeys: [],
        secretEnvKeyPattern: /(SECRET|PASSWORD|TOKEN|KEY|PRIVATE)/i,
        sqlPath: 'sql',
        migrateBeforeStart: true,
        dbQueryMaxRows: 500,
        defaultAppDbConnection: null,
        pm2Defaults: {
          exec_mode: 'fork',
          instances: 1,
          autorestart: true,
          max_memory_restart: '512M',
          max_restarts: 10,
          min_uptime: '5s',
          kill_timeout: 5000,
          merge_logs: true
        },
        createAuthenticate: () => {
          if (fastify.account?.authenticate?.admin) {
            return [fastify.account.authenticate.admin];
          }
          return [];
        }
      },
      options
    );

    if (fastify.sequelize?.instance && options.defaultAppDb) {
      assertDefaultAppDbSeparated(options.defaultAppDb, fastify.sequelize.instance);
    }

    if (!fastify.hasDecorator('multipartErrors')) {
      await fastify.register(require('@fastify/multipart'), {
        limits: {
          fileSize: options.maxZipSize
        }
      });
    }

    if (!fastify.hasReplyDecorator('from')) {
      await fastify.register(require('@fastify/reply-from'));
    }

    fastify.register(require('@kne/fastify-namespace'), {
      options,
      name: options.name,
      modules: [
        [
          'models',
          await fastify.sequelize.addModels(path.join(pkgRoot, 'libs/models'), {
            prefix: options.dbTableNamePrefix
          })
        ],
        ['services', path.join(pkgRoot, 'libs/services')],
        ['controllers', path.join(pkgRoot, 'libs/controllers')]
      ]
    });

    fastify.addHook('onReady', async () => {
      const { services } = fastify[options.name];
      await services.bootstrap.onReady();
    });

    fastify.addHook('onClose', async () => {
      const { services } = fastify[options.name];
      await services.bootstrap.onClose();
    });
  },
  {
    name: 'fastify-app-manager-host',
    dependencies: ['fastify-sequelize']
  }
);
