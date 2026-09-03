const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { searchZhihu, fetchHotList, clamp } = require('../utils/zhihu');

const SETTING_KEY = 'blogLead.zhihu';

const DEFAULT_SETTINGS = {
  enabled: true,
  accessSecret: '',
  keywords: [],
  countPerKeyword: 5,
  scheduleType: 'daily',
  scheduleHour: 9,
  intervalHours: 24,
  maxRequestsPerRun: 20,
  includeHot: false,
  hotLimit: 10,
  defaultBlogStatus: 'draft',
  defaultIsPublic: true,
  defaultGroups: [],
  lastRunAt: null
};

const maskSecret = secret => {
  if (!secret || typeof secret !== 'string') {
    return '';
  }
  if (secret.length <= 4) {
    return '****';
  }
  return `${'*'.repeat(Math.max(4, secret.length - 4))}${secret.slice(-4)}`;
};

/** 知乎开放平台 Title 常自带末尾「 - 知乎」，仅去掉结尾，不碰中间内容 */
const stripTrailingZhihuTitleSuffix = title => {
  if (!title || typeof title !== 'string') {
    return title || '';
  }
  return title.replace(/\s*-\s*知乎\s*$/, '').trim();
};

const normalizeGroups = groups => {
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups
    .map(item => {
      if (!item) {
        return null;
      }
      if (typeof item === 'string') {
        const code = item.trim();
        return code ? { code, name: code } : null;
      }
      const code = String(item.code || '').trim();
      if (!code) {
        return null;
      }
      return {
        code,
        name: String(item.name || code).trim() || code
      };
    })
    .filter(Boolean);
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const getRawSettings = async () => {
    const row = await models.setting.findOne({ where: { settingKey: SETTING_KEY } });
    const settings = Object.assign({}, DEFAULT_SETTINGS, row?.settingValue || {});
    if (row?.settingValue?.defaultIsPublic === undefined && row?.settingValue?.defaultIsPrivate !== undefined) {
      settings.defaultIsPublic = !Boolean(row.settingValue.defaultIsPrivate);
    }
    delete settings.defaultIsPrivate;
    settings.defaultGroups = normalizeGroups(settings.defaultGroups);
    return settings;
  };

  const getSettings = async ({ includeSecret = false } = {}) => {
    const settings = await getRawSettings();
    const hasSecret = Boolean(settings.accessSecret || fastify.config.ZHIHU_ACCESS_SECRET);
    const result = {
      ...settings,
      hasSecret,
      accessSecretMasked: maskSecret(settings.accessSecret),
      usingEnvSecret: !settings.accessSecret && Boolean(fastify.config.ZHIHU_ACCESS_SECRET)
    };
    if (!includeSecret) {
      delete result.accessSecret;
    }
    return result;
  };

  const resolveSecret = settings => settings.accessSecret || fastify.config.ZHIHU_ACCESS_SECRET || '';

  const saveSettings = async payload => {
    const current = await getRawSettings();
    const next = {
      ...current,
      enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled,
      keywords: Array.isArray(payload.keywords) ? payload.keywords.map(item => String(item || '').trim()).filter(Boolean) : current.keywords,
      countPerKeyword: clamp(payload.countPerKeyword ?? current.countPerKeyword, 1, 10, 5),
      scheduleType: payload.scheduleType === 'intervalHours' ? 'intervalHours' : 'daily',
      scheduleHour: clamp(payload.scheduleHour ?? current.scheduleHour, 0, 23, 9),
      intervalHours: clamp(payload.intervalHours ?? current.intervalHours, 1, 168, 24),
      maxRequestsPerRun: clamp(payload.maxRequestsPerRun ?? current.maxRequestsPerRun, 1, 100, 20),
      includeHot: payload.includeHot !== undefined ? Boolean(payload.includeHot) : current.includeHot,
      hotLimit: clamp(payload.hotLimit ?? current.hotLimit, 1, 30, 10),
      defaultBlogStatus: payload.defaultBlogStatus === 'published' ? 'published' : 'draft',
      defaultIsPublic: payload.defaultIsPublic !== undefined ? Boolean(payload.defaultIsPublic) : current.defaultIsPublic,
      defaultGroups: payload.defaultGroups !== undefined ? normalizeGroups(payload.defaultGroups) : normalizeGroups(current.defaultGroups),
      lastRunAt: current.lastRunAt
    };
    delete next.defaultIsPrivate;

    if (payload.accessSecret !== undefined) {
      const secret = String(payload.accessSecret || '').trim();
      // 空字符串表示清除渠道密钥、回退 env；传入脱敏串则保留原值
      if (!secret) {
        next.accessSecret = '';
      } else if (secret.includes('*') && secret.endsWith((current.accessSecret || '').slice(-4))) {
        next.accessSecret = current.accessSecret;
      } else {
        next.accessSecret = secret;
      }
    }

    await services.setting.saveOrCreate({
      settingKey: SETTING_KEY,
      settingValue: next
    });

    return getSettings();
  };

  const touchLastRunAt = async () => {
    const current = await getRawSettings();
    await services.setting.saveOrCreate({
      settingKey: SETTING_KEY,
      settingValue: {
        ...current,
        lastRunAt: new Date().toISOString()
      }
    });
  };

  const shouldRunFetch = async () => {
    const settings = await getRawSettings();
    if (!settings.enabled) {
      return false;
    }
    if (!Array.isArray(settings.keywords) || settings.keywords.length === 0) {
      return false;
    }
    if (!resolveSecret(settings)) {
      return false;
    }

    const lastRunAt = settings.lastRunAt ? new Date(settings.lastRunAt) : null;
    const now = new Date();

    if (settings.scheduleType === 'intervalHours') {
      if (!lastRunAt) {
        return true;
      }
      const diffHours = (now.getTime() - lastRunAt.getTime()) / (1000 * 60 * 60);
      return diffHours >= (settings.intervalHours || 24);
    }

    // daily: 当前小时匹配 scheduleHour，且今天尚未跑过
    if (now.getHours() !== clamp(settings.scheduleHour, 0, 23, 9)) {
      return false;
    }
    if (!lastRunAt) {
      return true;
    }
    return lastRunAt.toDateString() !== now.toDateString();
  };

  const list = async ({ keyword, status, channel, perPage = 20, currentPage = 1 }) => {
    const where = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'pending';
    }
    if (channel) {
      where.channel = channel;
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { summary: { [Op.iLike]: `%${keyword}%` } }, { content: { [Op.iLike]: `%${keyword}%` } }];
    }

    const limit = Number(perPage) || 20;
    const page = Number(currentPage) || 1;
    const { count, rows } = await models.blogLead.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [
        ['fetchedAt', 'DESC'],
        ['createdAt', 'DESC']
      ],
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone'],
          required: false
        }
      ]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const detail = async ({ id }) => {
    const lead = await models.blogLead.findByPk(id, {
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone'],
          required: false
        }
      ]
    });
    if (!lead) {
      throw new Error('文章线索不存在');
    }
    return lead;
  };

  const update = async ({ id, title, content, summary }) => {
    const lead = await models.blogLead.findByPk(id);
    if (!lead) {
      throw new Error('文章线索不存在');
    }
    if (lead.status === 'completed') {
      throw new Error('已完成的线索不可编辑');
    }
    const payload = {};
    if (title !== undefined) {
      payload.title = title;
    }
    if (content !== undefined) {
      payload.content = content;
    }
    if (summary !== undefined) {
      payload.summary = summary;
    }
    return lead.update(payload);
  };

  const remove = async ({ id }) => {
    const lead = await models.blogLead.findByPk(id);
    if (!lead) {
      throw new Error('文章线索不存在');
    }
    await lead.destroy();
    return { success: true };
  };

  const complete = async (userInfo, { id, title, content, groups, isPublic, status }) => {
    const lead = await models.blogLead.findByPk(id);
    if (!lead) {
      throw new Error('文章线索不存在');
    }
    if (lead.status === 'completed') {
      throw new Error('线索已完成');
    }

    const nextTitle = title !== undefined ? title : lead.title;
    const nextContent = (content !== undefined ? content : lead.content || '').trim();
    if (!nextContent) {
      throw new Error('请先补充正文后再完成');
    }

    const settings = await getRawSettings();
    const blogStatus = status || settings.defaultBlogStatus || 'draft';

    const blog = await services.blog.create(userInfo, {
      title: nextTitle,
      content: nextContent,
      status: blogStatus,
      isPublic: isPublic !== undefined ? isPublic : settings.defaultIsPublic !== false,
      groups: groups !== undefined ? normalizeGroups(groups) : normalizeGroups(settings.defaultGroups),
      publishTime: blogStatus === 'published' ? new Date() : undefined
    });

    await lead.update({
      title: nextTitle,
      content: nextContent,
      status: 'completed',
      blogId: blog.id,
      createdUserId: userInfo.id
    });

    return {
      lead,
      blog
    };
  };

  const findExistingExternalIds = async (channel, externalIds) => {
    if (!externalIds.length) {
      return new Set();
    }
    const rows = await models.blogLead.findAll({
      attributes: ['externalId'],
      where: {
        channel,
        externalId: {
          [Op.in]: externalIds
        }
      }
    });
    return new Set(rows.map(row => row.externalId).filter(Boolean));
  };

  const createLeadFromItem = async ({ item, channel, keyword }) => {
    const title = stripTrailingZhihuTitleSuffix(item.title) || keyword || '未命名';
    return models.blogLead.create({
      title,
      summary: item.summary || '',
      content: '',
      status: 'pending',
      channel,
      sourceUrl: item.sourceUrl || '',
      externalId: item.externalId || null,
      meta: {
        keyword,
        contentType: item.contentType,
        authorName: item.authorName,
        voteUpCount: item.voteUpCount,
        commentCount: item.commentCount,
        editTime: item.editTime
      },
      fetchedAt: new Date()
    });
  };

  const fetchFromZhihu = async ({ force = false } = {}) => {
    const settings = await getRawSettings();
    if (!force && !settings.enabled) {
      return {
        success: false,
        message: '知乎渠道未启用'
      };
    }

    const keywords = (settings.keywords || []).map(item => String(item || '').trim()).filter(Boolean);
    if (keywords.length === 0 && !settings.includeHot) {
      return {
        success: false,
        message: '请先在文章线索设置中配置关键词'
      };
    }

    const secret = resolveSecret(settings);
    if (!secret) {
      return {
        success: false,
        message: '未配置知乎 Access Secret（渠道设置或环境变量 ZHIHU_ACCESS_SECRET）'
      };
    }

    const created = [];
    const skipped = [];
    let requestCount = 0;
    const maxRequests = clamp(settings.maxRequestsPerRun, 1, 100, 20);
    const countPerKeyword = clamp(settings.countPerKeyword, 1, 10, 5);

    for (const keyword of keywords) {
      if (requestCount >= maxRequests) {
        break;
      }
      requestCount += 1;
      const items = await searchZhihu({
        query: keyword,
        count: countPerKeyword,
        secret
      });
      const existing = await findExistingExternalIds('zhihu', items.map(item => item.externalId).filter(Boolean));

      for (const item of items) {
        if (item.externalId && existing.has(item.externalId)) {
          skipped.push(item.externalId);
          continue;
        }
        if (item.sourceUrl) {
          const byUrl = await models.blogLead.findOne({
            where: { channel: 'zhihu', sourceUrl: item.sourceUrl }
          });
          if (byUrl) {
            skipped.push(item.sourceUrl);
            continue;
          }
        }
        const lead = await createLeadFromItem({ item, channel: 'zhihu', keyword });
        created.push(lead);
        if (item.externalId) {
          existing.add(item.externalId);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (settings.includeHot && requestCount < maxRequests) {
      requestCount += 1;
      const hotItems = await fetchHotList({
        limit: settings.hotLimit,
        secret
      });
      const existing = await findExistingExternalIds('zhihu', hotItems.map(item => item.externalId).filter(Boolean));
      for (const item of hotItems) {
        if (item.externalId && existing.has(item.externalId)) {
          skipped.push(item.externalId);
          continue;
        }
        const lead = await createLeadFromItem({ item, channel: 'zhihu', keyword: 'hot' });
        created.push(lead);
      }
    }

    await touchLastRunAt();

    return {
      success: true,
      message: `成功创建 ${created.length} 条线索，跳过 ${skipped.length} 条重复`,
      createdCount: created.length,
      skippedCount: skipped.length,
      requestCount,
      createdIds: created.map(item => item.id)
    };
  };

  Object.assign(fastify[options.name].services, {
    blogLead: {
      SETTING_KEY,
      DEFAULT_SETTINGS,
      getSettings,
      saveSettings,
      shouldRunFetch,
      list,
      detail,
      update,
      remove,
      complete,
      fetchFromZhihu
    }
  });
});
