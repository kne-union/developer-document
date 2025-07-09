const fp = require('fastify-plugin');
const transform = require('lodash/transform');
const fs = require('fs-extra');
const path = require('node:path');

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const saveOrCreate = async ({ settingKey, settingValue }) => {
    const setting = await models.setting.findOne({ where: { settingKey } });
    if (!setting) {
      return models.setting.create({ settingKey, settingValue });
    }
    return setting.update({ settingValue });
  };

  const detail = async () => {
    const settings = await models.setting.findAll({
      where: {
        status: 'open'
      }
    });
    return transform(
      settings,
      (result, value) => {
        Object.assign(result, {
          [value.settingKey]: value.settingValue
        });
      },
      {}
    );
  };

  const includeSetting = async dir => {
    const filePath = path.resolve(dir, 'setting.json');
    if (!(await fs.exists(filePath))) {
      console.log('init data config file not exists');
      return;
    }

    const data = Object.assign({}, await fs.readJson(filePath));
    Object.keys(data).map(async name => {
      const setting = await models.setting.findOne({ where: { settingKey: name } });
      if (setting) {
        return;
      }
      console.log(`--------执行setting ${name}导入----------`);
      await models.setting.create({ settingKey: name, settingValue: data[name] });
    });
  };

  Object.assign(fastify[options.name].services, {
    setting: {
      saveOrCreate,
      detail,
      includeSetting
    }
  });
});
