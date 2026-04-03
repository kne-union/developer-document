import { Tag } from 'antd';

const TYPE_LABELS = {
  frontend: '前端组件',
  nodejs: 'NodeJS',
  engineering: '工程化',
  miniprogram: '小程序',
  prompts: 'Prompts',
  other: '其他'
};

const TYPE_COLORS = {
  frontend: 'blue',
  nodejs: 'green',
  engineering: 'orange',
  miniprogram: 'cyan',
  prompts: 'purple',
  other: 'default'
};

const getColumns = ({ navigate, baseUrl }) => {
  return [
    {
      name: 'packageName',
      title: 'Package Name',
      valueOf: item => item.packageName,
      primary: true,
      hover: true,
      onClick: ({ colItem }) => navigate(`${baseUrl}/detail?id=${colItem.id}`)
    },
    {
      name: 'name',
      title: '显示名称',
      valueOf: item => item.name || '-',
      hover: true,
      onClick: ({ colItem }) => navigate(`${baseUrl}/detail?id=${colItem.id}`)
    },
    {
      name: 'type',
      title: '类型',
      valueOf: item => {
        const type = item.type || 'other';
        return <Tag color={TYPE_COLORS[type] || 'default'}>{TYPE_LABELS[type] || type}</Tag>;
      }
    },
    {
      name: 'latestVersion',
      title: '最新版本',
      valueOf: item => item.latestVersion || '-'
    },
    {
      name: 'isPublic',
      title: '公开',
      valueOf: item => <Tag color={item.isPublic ? 'success' : 'warning'}>{item.isPublic ? '是' : '否'}</Tag>
    },
    {
      name: 'description',
      title: '描述',
      type: 'description',
      ellipsis: true,
      valueOf: item => item.description || '-'
    }
  ];
};

export default getColumns;
