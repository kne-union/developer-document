const fastify = require('fastify')({
  logger: true,
  querystringParser: str => require('qs').parse(str)
});

const fastifyEnv = require('@fastify/env');
const packageJson = require('./package.json');
const path = require('node:path');

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
        DB_DIALECT: { type: 'string', default: 'sqlite' },
        DB_HOST: { type: 'string', default: 'data.db' },
        DB_PORT: { type: 'number' },
        DB_USERNAME: { type: 'string' },
        DB_PASSWORD: { type: 'string' },
        DB_DATABASE: { type: 'string' },

        ENV: { type: 'string', default: 'local' },
        PORT: { type: 'number', default: 8061 },
        IS_TEST: { type: 'boolean', default: false },

        ORIGIN: { type: 'string', default: '' },
        TASK_CRON: { type: 'string', default: '' },

        OSS_REGION: { type: 'string' },
        OSS_BUCKET: { type: 'string' },
        OSS_ACCESS_KEY_ID: { type: 'string' },
        OSS_ACCESS_KEY_SECRET: { type: 'string' },

        ALISMTP_USER: { type: 'string' },
        ALISMTP_PASSWORD: { type: 'string' },
        ALISMTP_ENDPOINT: { type: 'string' }
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
      fastify.register(require('@kne/fastify-account'), {
        isTest: fastify.config.IS_TEST,
        prefix: `${options.prefix}`,
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

      fastify.register(require('fastify-cron'), {
        jobs: [
          {
            cronTime: '0 9 * * *', // 每天早上9点执行
            onTick: async () => {
              console.log('开始执行每日博客搜索任务...');
              try {
                await fastify.project.services.task.createBlogSearchTask();
                console.log('每日博客搜索任务创建成功');
              } catch (error) {
                console.error('每日博客搜索任务创建失败:', error.message);
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

      fastify.register(require('@kne/fastify-signature'), {
        prefix: `${options.prefix}/signature`
      });

      /*fastify.register(require('@kne/fastify-aliyun'), {
    prefix: `${options.prefix}/aliyun`,
    oss: {
      baseDir: 'video-conference',
      region: fastify.config.OSS_REGION,
      accessKeyId: fastify.config.OSS_ACCESS_KEY_ID,
      accessKeySecret: fastify.config.OSS_ACCESS_KEY_SECRET,
      bucket: fastify.config.OSS_BUCKET
    }
  });*/
    })
  );

  fastify.register(
    require('fastify-plugin')(async fastify => {
      await fastify.sequelize.sync();
    })
  );

  fastify.register(
    require('fastify-plugin')(async fastify => {
      const getEntry = () => {
        const env = fastify.config.ENV;
        if (env === 'staging') {
          return 'entry.html';
        }

        if (env === 'prod') {
          return 'entry-prod.html';
        }

        return 'index.html';
      };
      fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, './build'), // 静态文件目录
        prefix: '/',
        decorateReply: false,
        index: getEntry()
      });
      fastify.setNotFoundHandler((req, reply) => {
        if (req.method === 'GET') {
          reply.sendFile(getEntry(), { root: path.join(__dirname, './build') });
        } else {
          reply.code(404).send({ error: 'Not Found' });
        }
      });
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
    });
  }
};
