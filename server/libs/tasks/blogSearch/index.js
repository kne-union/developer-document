const runner = async (fastify, options, { task, updateProgress, log }) => {
  const { services } = fastify.project;

  updateProgress(5);
  log({ message: '开始从知乎拉取文章线索' });

  try {
    const result = await services.blogLead.fetchFromZhihu({ force: true });
    updateProgress(100);
    log({ data: result, message: result.message || '知乎线索拉取结束' });
    return result;
  } catch (error) {
    log({ data: { message: error.message, code: error.code }, message: '知乎线索拉取失败' });
    return {
      success: false,
      message: error.message || '知乎线索拉取失败',
      code: error.code
    };
  }
};

module.exports = runner;
