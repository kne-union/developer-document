const { literal, Op } = require('sequelize');

const QUERY_BIND = '$query';

const buildSearchTextFromIndex = ({ index = [], components = {} }) => {
  const parts = [];
  index.forEach(item => {
    parts.push(item.name, item.token, item.summary);
  });
  Object.values(components).forEach(item => {
    if (!item) {
      return;
    }
    parts.push(item.name, item.token, item.summary);
    if (item.api) {
      parts.push(String(item.api).slice(0, 2000));
    }
  });
  return parts.filter(Boolean).join('\n').slice(0, 500000);
};

const ftsMatchSql = (column, queryParam = QUERY_BIND) => `to_tsvector('simple', coalesce(${column}, '')) @@ plainto_tsquery('simple', ${queryParam})`;

const ftsRankSql = (column, queryParam = QUERY_BIND) => `ts_rank(to_tsvector('simple', coalesce(${column}, '')), plainto_tsquery('simple', ${queryParam}))`;

const ftsWhere = column => ({
  [Op.and]: [literal(ftsMatchSql(column))]
});

const ftsOrder = column => [literal(`${ftsRankSql(column)} DESC`)];

const ftsHeadline = column => literal(`ts_headline('simple', coalesce(${column}, ''), plainto_tsquery('simple', ${QUERY_BIND}), 'MaxFragments=2,MaxWords=30,MinWords=10')`);

module.exports = {
  buildSearchTextFromIndex,
  ftsMatchSql,
  ftsRankSql,
  ftsWhere,
  ftsOrder,
  ftsHeadline
};
