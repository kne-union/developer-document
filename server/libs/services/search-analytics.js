const fp = require('fastify-plugin');
const { Op, fn, col, literal } = require('sequelize');

/** 聚合查询用物理列名（snake_case），避免 col('hitCount') 在 PG 里找不到列 */
const aggCol = (model, attribute) => col(model.rawAttributes[attribute].field);

const buildCreatedAtRange = ({ startAt, endAt }) => {
  if (!startAt && !endAt) {
    return undefined;
  }
  const createdAt = {};
  if (startAt) {
    createdAt[Op.gte] = startAt;
  }
  if (endAt) {
    createdAt[Op.lte] = endAt;
  }
  return createdAt;
};

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];
  const searchRecord = models.searchRecord;
  const hitCountCol = aggCol(searchRecord, 'hitCount');
  const searchTypeCol = aggCol(searchRecord, 'searchType');
  const dayExpr = literal(`DATE(${searchRecord.rawAttributes.createdAt.field})`);

  const listRecords = async ({ searchType, query, userId, zeroHitOnly, startAt, endAt, perPage = 20, currentPage = 1 }) => {
    const where = {};
    if (searchType) {
      where.searchType = searchType;
    }
    if (query) {
      where.query = { [Op.iLike]: `%${query}%` };
    }
    if (userId) {
      where.createdUserId = userId;
    }
    if (zeroHitOnly) {
      where.hitCount = 0;
    }
    const createdAt = buildCreatedAtRange({ startAt, endAt });
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const offset = (currentPage - 1) * perPage;
    const { count, rows } = await searchRecord.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone', 'nickname']
        }
      ]
    });
    return { totalCount: count, pageData: rows };
  };

  const summary = async ({ startAt, endAt }) => {
    const where = {};
    const createdAt = buildCreatedAtRange({ startAt, endAt });
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const total = await searchRecord.count({ where });
    const hitTotal = await searchRecord.count({ where: { ...where, hitCount: { [Op.gt]: 0 } } });
    const byType = await searchRecord.findAll({
      attributes: [
        [searchTypeCol, 'searchType'],
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', hitCountCol), 'hitCount']
      ],
      where,
      group: [searchTypeCol],
      raw: true
    });

    return {
      total,
      hitTotal,
      zeroHitTotal: total - hitTotal,
      hitRate: total ? hitTotal / total : 0,
      byType
    };
  };

  const topQueries = async ({ searchType, limit = 10, startAt, endAt }) => {
    const where = {};
    if (searchType) {
      where.searchType = searchType;
    }
    const createdAt = buildCreatedAtRange({ startAt, endAt });
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const rows = await searchRecord.findAll({
      attributes: ['query', [fn('COUNT', col('id')), 'searchCount'], [fn('SUM', hitCountCol), 'hitCount']],
      where,
      group: ['query'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit,
      raw: true
    });
    return rows;
  };

  const trend = async ({ days = 7 }) => {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const rows = await searchRecord.findAll({
      attributes: [
        [dayExpr, 'day'],
        [fn('COUNT', col('id')), 'searchCount'],
        [fn('SUM', hitCountCol), 'hitCount']
      ],
      where: { createdAt: { [Op.gte]: start } },
      group: [dayExpr],
      order: [[dayExpr, 'ASC']],
      raw: true
    });
    return rows;
  };

  Object.assign(fastify[options.name].services, {
    searchAnalytics: {
      listRecords,
      summary,
      topQueries,
      trend
    }
  });
});
