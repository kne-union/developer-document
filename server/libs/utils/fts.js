const { literal, Op } = require('sequelize');
const { stripHtml, apiMarkdownOf } = require('./api-markdown');

const QUERY_BIND = '$query';

// 单行 searchText 会整体进 to_tsvector，超过约 1MB 会被 PG 拒绝；实测最大包（components-core）
// 在下列配额下约 26 万字符，留足余量
const SEARCH_TEXT_LIMIT = 500000;
const API_CHARS_PER_COMPONENT = 8000;
// 示例代码总量可达 79 万字符，只取开头（import 与首屏用法）足以支撑召回
const CODE_CHARS_PER_EXAMPLE = 500;

const buildSearchTextFromIndex = ({ index = [], components = {} }) => {
  const parts = [];
  index.forEach(item => {
    parts.push(item.name, item.token, item.summary);
  });
  Object.values(components).forEach(item => {
    if (!item) {
      return;
    }
    parts.push(item.name, item.token, stripHtml(item.summary));

    const api = apiMarkdownOf(item);
    if (api) {
      parts.push(api.slice(0, API_CHARS_PER_COMPONENT));
    }

    (item.examples || []).forEach(example => {
      parts.push(example.title, example.description);
      if (example.code) {
        parts.push(String(example.code).slice(0, CODE_CHARS_PER_EXAMPLE));
      }
    });
  });
  return parts.filter(Boolean).join('\n').slice(0, SEARCH_TEXT_LIMIT);
};

const ftsMatchSql = (column, queryParam = QUERY_BIND) => `to_tsvector('simple', coalesce(${column}, '')) @@ plainto_tsquery('simple', ${queryParam})`;

const ftsRankSql = (column, queryParam = QUERY_BIND) => `ts_rank(to_tsvector('simple', coalesce(${column}, '')), plainto_tsquery('simple', ${queryParam}))`;

const ftsWhere = column => ({
  [Op.and]: [literal(ftsMatchSql(column))]
});

const ftsOrder = column => [literal(`${ftsRankSql(column)} DESC`)];

const ftsHeadline = column => literal(`ts_headline('simple', coalesce(${column}, ''), plainto_tsquery('simple', ${QUERY_BIND}), 'MaxFragments=2,MaxWords=30,MinWords=10')`);

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/;

const hasCJK = value => CJK_RE.test(String(value || ''));

const MAX_BIGRAMS = 8;

// to_tsvector('simple') 不切 CJK，"下拉加载" 与 "下拉加载更多" 是两个不同 token，
// 中文短语必然 0 命中，因此中文走 ILIKE：先整串，再退化成 bigram AND
const bigrams = value => {
  const clean = String(value || '').replace(/\s+/g, '');
  if (clean.length <= 2) {
    return clean ? [clean] : [];
  }
  const grams = [];
  for (let i = 0; i + 2 <= clean.length; i += 1) {
    grams.push(clean.slice(i, i + 2));
  }
  return [...new Set(grams)].slice(0, MAX_BIGRAMS);
};

const escapeLike = value => String(value).replace(/[\\%_]/g, char => `\\${char}`);

/**
 * 生成 ILIKE AND 条件，返回 where 片段与需要合并的 bind
 */
const likeWhere = (column, terms) => {
  const usable = (terms || []).filter(Boolean);
  if (!usable.length) {
    return null;
  }
  const bind = {};
  const clauses = usable.map((term, i) => {
    const key = `like${i}`;
    bind[key] = `%${escapeLike(term)}%`;
    return `coalesce(${column}, '') ILIKE $${key}`;
  });
  return {
    where: { [Op.and]: [literal(clauses.join(' AND '))] },
    bind
  };
};

module.exports = {
  buildSearchTextFromIndex,
  ftsMatchSql,
  ftsRankSql,
  ftsWhere,
  ftsOrder,
  ftsHeadline,
  hasCJK,
  bigrams,
  likeWhere,
  SEARCH_TEXT_LIMIT
};
