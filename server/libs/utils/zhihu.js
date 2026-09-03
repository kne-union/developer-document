const ZHIHU_SEARCH_URL = 'https://developer.zhihu.com/api/v1/content/zhihu_search';
const ZHIHU_HOT_URL = 'https://developer.zhihu.com/api/v1/content/hot_list';

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(n)));
};

const requestZhihu = async ({ url, secret, query }) => {
  if (!secret) {
    const error = new Error('ZHIHU_ACCESS_SECRET 未配置');
    error.code = 20001;
    throw error;
  }

  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`${url}?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.Message || data.message || data.error || `知乎 API HTTP ${response.status}`);
    error.code = data.Code || response.status;
    error.payload = data;
    throw error;
  }

  if (data.Code !== undefined && data.Code !== 0) {
    const error = new Error(data.Message || data.message || '知乎 API 调用失败');
    error.code = data.Code;
    error.payload = data;
    throw error;
  }

  return data;
};

const normalizeSearchItems = data => {
  const items = data?.Data?.Items || data?.Data?.items || [];
  return items.map(item => ({
    title: item.Title || item.title || '',
    contentType: item.ContentType || item.contentType || '',
    externalId: String(item.ContentID || item.contentId || item.ContentId || ''),
    summary: item.ContentText || item.contentText || item.Summary || item.summary || '',
    sourceUrl: item.Url || item.url || '',
    commentCount: item.CommentCount ?? item.commentCount ?? 0,
    voteUpCount: item.VoteUpCount ?? item.voteUpCount ?? 0,
    authorName: item.AuthorName || item.authorName || '',
    editTime: item.EditTime || item.editTime || null
  }));
};

const normalizeHotItems = data => {
  const items = data?.Data?.Items || data?.Data?.items || [];
  return items.map((item, index) => ({
    title: item.Title || item.title || '',
    contentType: 'Hot',
    externalId: `hot:${item.Url || item.url || index}`,
    summary: item.Summary || item.summary || '',
    sourceUrl: item.Url || item.url || '',
    commentCount: 0,
    voteUpCount: 0,
    authorName: '',
    editTime: null
  }));
};

const searchZhihu = async ({ query, count = 5, secret }) => {
  const data = await requestZhihu({
    url: ZHIHU_SEARCH_URL,
    secret,
    query: {
      Query: query,
      Count: clamp(count, 1, 10, 5)
    }
  });
  return normalizeSearchItems(data);
};

const fetchHotList = async ({ limit = 10, secret }) => {
  const data = await requestZhihu({
    url: ZHIHU_HOT_URL,
    secret,
    query: {
      Limit: clamp(limit, 1, 30, 10)
    }
  });
  return normalizeHotItems(data);
};

module.exports = {
  searchZhihu,
  fetchHotList,
  clamp
};
