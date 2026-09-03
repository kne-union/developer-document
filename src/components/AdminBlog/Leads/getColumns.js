import dayjs from 'dayjs';

const getColumns = ({ formatMessage, onTitleClick }) => {
  return [
    {
      name: 'title',
      title: formatMessage({ id: 'common.title' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => {
        onTitleClick && onTitleClick(colItem);
      }
    },
    {
      name: 'channel',
      title: formatMessage({ id: 'adminBlog.leads.channel' }),
      getValueOf: item => (item.channel === 'zhihu' ? formatMessage({ id: 'adminBlog.leads.channelZhihu' }) : item.channel)
    },
    {
      name: 'summary',
      title: formatMessage({ id: 'adminBlog.leads.summary' }),
      getValueOf: item => {
        const text = item.summary || '';
        return text.length > 80 ? `${text.slice(0, 80)}...` : text || '-';
      }
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      renderType: 'tag',
      getValueOf: item => {
        if (item.status === 'completed') {
          return { type: 'success', text: formatMessage({ id: 'adminBlog.leads.statusCompleted' }) };
        }
        return { type: 'warning', text: formatMessage({ id: 'adminBlog.leads.statusPending' }) };
      }
    },
    {
      name: 'meta',
      title: formatMessage({ id: 'adminBlog.leads.keyword' }),
      getValueOf: item => item.meta?.keyword || '-'
    },
    {
      name: 'fetchedAt',
      title: formatMessage({ id: 'adminBlog.leads.fetchedAt' }),
      getValueOf: item => (item.fetchedAt ? dayjs(item.fetchedAt).format('YYYY-MM-DD HH:mm:ss') : '-')
    },
    {
      name: 'createdAt',
      title: formatMessage({ id: 'common.createdAt' }),
      format: 'datetime'
    }
  ];
};

export default getColumns;
