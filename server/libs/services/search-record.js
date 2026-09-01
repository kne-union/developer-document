const fp = require('fastify-plugin');

const SEARCH_CHANNELS = {
  experience: 'mcp.search.experience',
  document_index: 'mcp.search.document_index',
  document: 'mcp.search.document'
};

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const recordSearch = async ({ searchType, query, results = [], userId, source = 'rest' }) => {
    const hitCount = results.length;
    const topHits = results.slice(0, 5).map(item => ({
      id: item.id,
      title: item.title || item.name,
      path: item.relativePath || item.token || item.docId,
      snippet: item.snippet
    }));

    await models.searchRecord.create({
      searchType,
      query,
      hitCount,
      topHits,
      source,
      createdUserId: userId
    });

    if (hitCount > 0 && fastify.statistics?.services?.collect) {
      const channel = SEARCH_CHANNELS[searchType];
      if (channel) {
        await fastify.statistics.services.collect({
          channel,
          data: { count: 1, hitCount },
          title: 'MCP 搜索统计',
          description: 'Cursor MCP 搜索命中统计'
        });
      }
    }

    return { hitCount, topHits };
  };

  Object.assign(fastify[options.name].services, {
    searchRecord: {
      recordSearch,
      SEARCH_CHANNELS
    }
  });
});
