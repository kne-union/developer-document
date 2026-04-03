const runner = async (fastify, options, { task, polling, updateProgress, log }) => {
  const { services } = fastify.project;
  const { models } = fastify.project;
  const { Op } = fastify.sequelize.Sequelize;

  // 获取第一个用户作为博客创建者
  const adminUser = await fastify.account.models.user.findOne();

  if (!adminUser) {
    return {
      success: false,
      message: '未找到用户，无法创建博客'
    };
  }

  // 获取系统中所有的博客标签
  const blogs = await models.blog.findAll({
    attributes: ['groups'],
    where: {
      groups: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: [] }]
      }
    }
  });

  // 提取所有唯一的标签
  const allGroups = new Set();
  blogs.forEach(blog => {
    if (Array.isArray(blog.groups)) {
      blog.groups.forEach(group => allGroups.add(group));
    }
  });

  const groups = Array.from(allGroups);
  console.log('系统标签:', groups);

  if (groups.length === 0) {
    return {
      success: true,
      message: '系统中没有标签，无需搜索',
      createdBlogs: []
    };
  }

  // 每个标签搜索20条
  const countPerGroup = 20;
  const totalItems = groups.length * countPerGroup;

  const createdBlogs = [];
  let processedCount = 0;

  // 今天的日期
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN');

  // 标签中文映射
  const groupLabels = {
    tech: '技术',
    life: '生活',
    product: '产品',
    design: '设计',
    other: '其他'
  };

  // 标签对应的关键词
  const searchKeywords = {
    tech: ['编程', '前端开发', '后端技术', 'DevOps', '人工智能', '云计算', '数据库', '网络安全', '开源项目', '软件开发'],
    life: ['健康生活', '美食推荐', '旅行攻略', '职场技巧', '读书笔记', '健身计划', '时间管理', '心理调节', '生活方式', '家庭教育'],
    product: ['产品设计', '用户体验', '需求分析', '产品经理', '数据分析', '用户研究', '产品规划', '敏捷开发', '商业模式', '市场调研'],
    design: ['UI设计', '平面设计', '用户体验设计', '交互设计', '品牌设计', '设计趋势', '设计工具', '视觉设计', '动效设计', '设计系统'],
    other: ['综合资讯', '热点新闻', '职场发展', '学习方法', '创业故事', '投资理财', '科技新闻', '文化教育', '社会热点', '行业观察']
  };

  // 使用 DuckDuckGo Instant Answer API 或 Wikipedia API 搜索
  const searchWeb = async keyword => {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(keyword)}&format=json&no_html=1&skip_disambig=1`;
    log({ data: { url }, message: 'DuckDuckGo搜索' });
    try {
      // 使用 DuckDuckGo Instant Answer API
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const results = [];

        // 从 Abstract 获取摘要
        if (data.Abstract) {
          results.push({
            title: data.Heading || keyword,
            snippet: data.Abstract,
            link: data.AbstractURL || '',
            source: data.AbstractSource || 'DuckDuckGo'
          });
        }

        // 从 RelatedTopics 获取相关主题
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || keyword,
                snippet: topic.Text,
                link: topic.FirstURL,
                source: 'DuckDuckGo'
              });
            }
          }
        }

        return results;
      }
    } catch (error) {
      log({ data: error, message: 'DuckDuckGo 搜索失败' });
    }

    // 备用方案：使用 Wikipedia API
    try {
      const url = `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(keyword)}&limit=5&format=json&origin=*`;
      log({ data: { url }, message: 'Wikipedia 搜索' });
      const wikiResponse = await fetch(url);

      if (wikiResponse.ok) {
        const [searchTerm, titles, descriptions, links] = await wikiResponse.json();
        const results = [];

        for (let i = 0; i < titles.length; i++) {
          results.push({
            title: titles[i],
            snippet: descriptions[i] || `关于${titles[i]}的详细介绍`,
            link: links[i],
            source: 'Wikipedia'
          });
        }

        return results;
      }
    } catch (error) {
      console.error(`Wikipedia 搜索失败 (${keyword}):`, error.message);
    }

    return [];
  };

  for (const group of groups) {
    const keywords = searchKeywords[group] || searchKeywords.other;
    const groupLabel = groupLabels[group] || group;
    const groupResults = [];

    // 使用不同的关键词搜索，确保获取足够的内容
    for (let i = 0; i < Math.ceil(countPerGroup / 2); i++) {
      const keyword = keywords[i % keywords.length];
      updateProgress(Math.round((processedCount / totalItems) * 100));

      try {
        const results = await searchWeb(`${keyword} ${dateStr}`);

        for (const result of results) {
          if (groupResults.length < countPerGroup) {
            groupResults.push({
              ...result,
              group,
              groupLabel
            });
          }
        }

        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`搜索关键词 ${keyword} 失败:`, error.message);
      }

      processedCount += 2;
    }

    // 为搜索结果创建博客草稿
    for (const result of groupResults) {
      try {
        const content = result.snippet + (result.link ? `\n\n参考链接: ${result.link}` : '') + (result.source ? `\n\n来源: ${result.source}` : '');

        const blog = await services.blog.create({
          title: `[${result.groupLabel}] ${result.title}`,
          content: content,
          status: 'draft',
          isPublic: true,
          groups: [group],
          createdUserId: adminUser.id
        });

        createdBlogs.push({
          id: blog.id,
          title: blog.title,
          group: group,
          source: result.source
        });
      } catch (error) {
        console.error('创建博客失败:', error.message);
      }
    }

    updateProgress(Math.round((processedCount / totalItems) * 100));
  }

  return {
    success: true,
    message: `成功创建了 ${createdBlogs.length} 篇博客草稿`,
    totalGroups: groups.length,
    createdBlogs: createdBlogs,
    usedApi: 'DuckDuckGo + Wikipedia API'
  };
};

module.exports = runner;
