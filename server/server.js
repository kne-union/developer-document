const fastify = require('fastify')({
  logger: true,
  querystringParser: str => require('qs').parse(str)
});

const fastifyEnv = require('@fastify/env');
const packageJson = require('./package.json');
const path = require('node:path');
const resolveOidcOptions = require('./libs/utils/oidc-options');
const createAppOidc = require('@kne/fastify-app-manager/oidc');

const version = `v${packageJson.version.split('.')[0]}`;

const options = {
  name: 'project',
  prefix: `/api/${version}`,
  initDataDir: path.join(__dirname, './initData'),
  getUserModel: () => {
    return fastify.account.models.user;
  }
};

const createServer = () => {
  fastify.register(fastifyEnv, {
    dotenv: true,
    schema: {
      type: 'object',
      properties: {
        DB_DIALECT: { type: 'string', default: 'postgres' },
        DB_HOST: { type: 'string' },
        DB_PORT: { type: 'number' },
        DB_USERNAME: { type: 'string' },
        DB_PASSWORD: { type: 'string' },
        DB_DATABASE: { type: 'string' },

        APPS_DB_DATABASE: { type: 'string', default: '' },

        ENV: { type: 'string', default: 'local' },
        PORT: { type: 'number', default: 8061 },
        IS_TEST: { type: 'boolean', default: false },

        ORIGIN: { type: 'string', default: 'https://develop.leapin-ai.com' },
        TASK_CRON: { type: 'string', default: '' },

        OIDC_KEY_SECRET: { type: 'string', default: '' },
        OIDC_COOKIE_SECRET: { type: 'string', default: '' },
        OIDC_IS_MAIN: { type: 'boolean', default: true },
        OIDC_SERVICE_CLIENT_ID: { type: 'string', default: 'developer-document-service' },
        OIDC_SERVICE_CLIENT_SECRET: { type: 'string', default: '' },
        DEV_TOKEN_TTL: { type: 'number', default: 180 * 24 * 60 * 60 },

        OSS_REGION: { type: 'string' },
        OSS_BUCKET: { type: 'string' },
        OSS_ACCESS_KEY_ID: { type: 'string' },
        OSS_ACCESS_KEY_SECRET: { type: 'string' },

        ALISMTP_USER: { type: 'string' },
        ALISMTP_PASSWORD: { type: 'string' },
        ALISMTP_ENDPOINT: { type: 'string' },

        DOCUMENT_INDEX_DIR: { type: 'string', default: '' },

        ZHIHU_ACCESS_SECRET: { type: 'string', default: '' },
        APPS_ROOT: { type: 'string', default: '' }
      }
    }
  });

  fastify.register(
    require('fastify-plugin')(async fastify => {
      fastify.register(require('@kne/fastify-sequelize'), {
        db: {
          dialect: fastify.config.DB_DIALECT,
          host: fastify.config.DB_HOST,
          port: fastify.config.DB_PORT,
          database: fastify.config.DB_DATABASE,
          username: fastify.config.DB_USERNAME,
          password: fastify.config.DB_PASSWORD
        },
        connections: fastify.config.APPS_DB_DATABASE
          ? {
              appManagerApps: {
                db: {
                  dialect: fastify.config.DB_DIALECT,
                  host: fastify.config.DB_HOST,
                  port: fastify.config.DB_PORT,
                  database: fastify.config.APPS_DB_DATABASE,
                  username: fastify.config.DB_USERNAME,
                  password: fastify.config.DB_PASSWORD,
                  logging: false
                },
                sqlPath: false,
                modelsPath: null
              }
            }
          : {},
        getUserModel: () => {
          return fastify.account.models.user;
        },
        modelsGlobOptions: {
          syncOptions: {}
        }
      });
    })
  );

  fastify.register(
    require('fastify-plugin')(async fastify => {
      const oidcOptions = resolveOidcOptions(fastify.config);
      fastify.decorate('oidcOptions', oidcOptions);

      fastify.register(require('@kne/fastify-account'), {
        isTest: fastify.config.IS_TEST,
        prefix: `${options.prefix}`,
        getUserAuthenticate: () => fastify.oidc.authenticate.user,
        sendMessage: async ({ name, type, messageType, props }) => {
          // messageType: 0:短信验证码，1:邮件验证码 type: 0:注册,2:登录,4:验证租户管理员,5:忘记密码
          if (messageType === 1 && type === 0) {
            await fastify.message.services.sendMessage({
              name,
              type: 0,
              code: 'REGISTERCODE',
              props,
              options: {
                title: '注册验证码'
              }
            });
          }
        }
      });

      fastify.register(require('@kne/fastify-oidc'), {
        mode: 'standalone',
        origin: oidcOptions.origin,
        isMain: fastify.config.OIDC_IS_MAIN,
        keyEncryptionSecret: oidcOptions.keySecret,
        cookieSecret: fastify.config.OIDC_COOKIE_SECRET || undefined,
        legacyToken: false,
        // 应用中心子应用的 back-channel logout 直连子应用进程
        allowPrivateFetch: url => fastify.config.ENV === 'local' || (!!fastify.appManager && url.hostname === fastify.appManager.options.upstreamHost),
        selfClient: { clientName: 'Developer Document' },
        resourceServers: [
          {
            identifier: oidcOptions.devTokenAudience,
            name: 'Developer Document 开发者令牌',
            accessTokenTTL: fastify.config.DEV_TOKEN_TTL
          }
        ],
        clients: [
          {
            clientId: oidcOptions.serviceClient.clientId,
            clientName: 'Developer Document 服务端',
            clientSecret: oidcOptions.serviceClient.clientSecret,
            grant_types: ['client_credentials', 'urn:ietf:params:oauth:grant-type:token-exchange'],
            response_types: [],
            token_endpoint_auth_method: 'client_secret_basic',
            allowedResources: [oidcOptions.audience, oidcOptions.devTokenAudience]
          }
        ]
      });
    })
  );

  fastify.register(
    require('fastify-plugin')(async fastify => {
      fastify.register(
        require('@kne/fastify-file-manager'),
        Object.assign(
          {},
          {
            prefix: `${options.prefix}/static`,
            root: path.resolve('./static')
          },
          fastify.config.OSS_ACCESS_KEY_ID
            ? {
                ossAdapter: () => {
                  return fastify.aliyun.services.oss;
                }
              }
            : {}
        )
      );

      fastify.register(require('@kne/fastify-aliyun'), {
        prefix: `${options.prefix}/aliyun`,
        oss: {
          baseDir: 'developer-document',
          region: fastify.config.OSS_REGION,
          accessKeyId: fastify.config.OSS_ACCESS_KEY_ID,
          accessKeySecret: fastify.config.OSS_ACCESS_KEY_SECRET,
          bucket: fastify.config.OSS_BUCKET
        }
      });

      fastify.register(require('fastify-cron'), {
        jobs: [
          {
            cronTime: '0 * * * *', // 每小时检查渠道周期
            onTick: async () => {
              try {
                const shouldRun = await fastify.project.services.blogLead.shouldRunFetch();
                if (!shouldRun) {
                  return;
                }
                console.log('开始执行知乎文章线索拉取任务...');
                await fastify.project.services.task.createBlogSearchTask();
                console.log('知乎文章线索拉取任务创建成功');
              } catch (error) {
                console.error('知乎文章线索拉取任务创建失败:', error.message);
              }
            },
            start: true
          },
          {
            cronTime: '0 10 * * *', // 每天早上10点执行
            onTick: async () => {
              console.log('开始执行每日 NPM 包同步任务...');
              try {
                await fastify.project.services.task.createNpmPackageSyncTask();
                console.log('每日 NPM 包同步任务创建成功');
              } catch (error) {
                console.error('每日 NPM 包同步任务创建失败:', error.message);
              }
            },
            start: true
          }
        ]
      });

      fastify.register(require('@kne/fastify-message'), {
        isTest: fastify.config.IS_TEST,
        emailConfig: {
          host: fastify.config.ALISMTP_ENDPOINT,
          port: 465,
          secure: true,
          user: fastify.config.ALISMTP_USER,
          pass: fastify.config.ALISMTP_PASSWORD
        },
        templateDir: path.join(__dirname, './messageTemplate')
      });

      fastify.register(require('@kne/fastify-group'), {
        prefix: `${options.prefix}/group`,
        getAuthenticate: name => {
          if (name === 'read') {
            return [];
          }
          const { authenticate } = fastify.account;
          return [authenticate.user, authenticate.admin];
        }
      });

      fastify.register(require('@kne/fastify-task'), {
        prefix: `${options.prefix}/task`,
        scriptName: 'index',
        cronTime: '*/1 * * * *',
        task: {
          blogSearch: target => {
            return fastify.project.services.task.saveBlogSearch(target);
          },
          npmPackageSync: target => {
            return fastify.project.services.task.saveNpmPackageSync(target);
          },
          remoteComponentDeploy: target => {
            return fastify.project.services.task.saveRemoteComponentDeploy(target);
          }
        },
        options
      });

      fastify.register(require('@kne/fastify-signature'), {
        prefix: `${options.prefix}/signature`
      });

      if (fastify.config.APPS_DB_DATABASE) {
        const { origin, issuer, serviceAudience } = fastify.oidcOptions;
        const appOidc = createAppOidc(fastify, { origin, issuer, serviceAudience, pathPrefix: '/app' });
        fastify.decorate('appOidc', appOidc);
        fastify.register(require('@kne/fastify-app-manager'), {
          prefix: `${options.prefix}/app-manager`,
          name: 'appManager',
          appsRoot: path.resolve(fastify.config.APPS_ROOT || './managed-apps'),
          migrateBeforeStart: true,
          defaultAppDbConnection: 'appManagerApps',
          defaultAppDb: {
            dialect: fastify.config.DB_DIALECT,
            host: fastify.config.DB_HOST,
            port: fastify.config.DB_PORT,
            database: fastify.config.APPS_DB_DATABASE,
            username: fastify.config.DB_USERNAME,
            password: fastify.config.DB_PASSWORD,
            logging: false
          },
          systemEnvKeys: appOidc.systemEnvKeys,
          resolveSystemEnv: appOidc.resolveSystemEnv,
          onAppRemoved: appOidc.onAppRemoved,
          resolveVersionFile: async ({ fileId }) => {
            const { buffer } = await fastify.fileManager.services.fileRecord.getFileBlob({ id: fileId });
            return buffer;
          }
        });
      }

      fastify.register(require('@kne/fastify-namespace'), {
        options,
        name: options.name,
        modules: [
          ['controllers', path.resolve(__dirname, './libs/controllers')],
          [
            'models',
            await fastify.sequelize.addModels(path.resolve(__dirname, './libs/models'), {
              getUserModel: options.getUserModel
            })
          ],
          ['services', path.resolve(__dirname, './libs/services')]
        ]
      });

      fastify.register(require('@kne/fastify-statistics'), {
        prefix: `${options.prefix}/statistics`,
        name: 'statistics'
      });

      fastify.register(require('./libs/mcp'), options);

      fastify.register(require('@kne/fastify-app-runtime'), {
        root: path.join(__dirname, './build'),
        packageJson,
        static: { manifestFiles: ['manifest.json', 'manifest-apps.json'] },
        pwa: {
          entries: [{ path: '/apps', manifest: '/manifest-apps.json', icon: '/pwa/apps-apple-touch-icon.png', title: '应用中心' }]
        }
      });
    })
  );

  fastify.register(
    require('fastify-plugin')(async fastify => {
      await fastify.sequelize.sync();
    })
  );

  fastify.register(
    require('fastify-plugin')((fastify, options) => {
      fastify.sequelize.syncPromise.then(() => {
        return fastify[options.name].services.setting.includeSetting(options.initDataDir);
      });
    }),
    options
  );

  fastify.register(require('@kne/fastify-response-data-format'));
};

module.exports = {
  fastify,
  createServer,
  start: () => {
    createServer();
    return fastify.then(async () => {
      fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' }, (err, address) => {
        if (err) throw err;
        console.log(`Server is now listening on ${address}`);
      });
      console.log('开始部署示例代码');
      const list = await fastify[options.name].models.npmPackage.findAll();
      for (const item of list) {
        try {
          await fastify[options.name].services.npmPackage.deployExamples({ id: item.id });
        } catch (e) {
          console.error(e);
        }
      }
      const remoteList = await fastify[options.name].models.remoteComponent.findAll();
      for (const item of remoteList) {
        try {
          await fastify[options.name].services.remoteComponent.deployComponents({ id: item.id });
        } catch (e) {
          console.error(e);
        }
      }
      console.log('示例代码部署完成');
      try {
        await fastify[options.name].services.promptDocument.syncAll();
      } catch (e) {
        console.error(e);
      }
    });
  }
};
