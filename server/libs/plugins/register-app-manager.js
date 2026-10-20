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
        logTimezone: '+08:00',
        logRotateDaily: true,
        logRotateIntervalMs: 60 * 1000,
        logRetentionMaxFiles: 10,
        logRetentionDays: 30,
        logCompress: true,
        loadSampleIntervalMs: 5000,
        loadHistoryMinutes: 10,
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

    const pwaDocument = require('../../../src/components/AppCenter/pwaDocument');
    fastify.get(`${options.prefix}/app/center/webmanifest`, async (request, reply) => {
      const name = String(request.query?.name || '').trim();
      if (!name) {
        reply.code(400).type('application/json; charset=utf-8');
        return { message: 'name is required' };
      }
      const listed = await fastify[options.name].services.app.centerList({ publicOnly: true });
      const app = (listed.pageData || []).find(item => item.name === name);
      if (!app) {
        reply.code(404).type('application/json; charset=utf-8');
        return { message: 'app not found' };
      }
      const wanted = String(request.query?.path || '');
      const surfaces = [{ path: app.pathUrl, title: app.label || app.name }].concat((app.entries || []).filter(entry => entry && entry.url).map(entry => ({ path: entry.url, title: entry.label || app.label || app.name })));
      const surface = surfaces.find(item => pwaDocument.normalizePath(item.path) === pwaDocument.normalizePath(wanted)) || surfaces[0];
      const manifest = pwaDocument.buildWebManifest(app, {
        path: surface.path,
        title: surface.title,
        icon: pwaDocument.iconUrlFor(app.icon, { staticPrefix: '/api/v1/static/file-id' })
      });
      reply.type('application/manifest+json; charset=utf-8').send(manifest);
      return reply;
    });
  },
  {
    name: 'fastify-app-manager-host',
    dependencies: ['fastify-sequelize']
  }
);
