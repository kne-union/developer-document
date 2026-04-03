import { Tag } from 'antd';

const GROUP_LABELS = {
  business: '业务',
  common: '通用'
};

const GROUP_COLORS = {
  business: 'blue',
  common: 'green'
};

const getColumns = ({ navigate, baseUrl }) => {
  return [
    {
      name: 'id',
      title: 'ID',
      type: 'serialNumber',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'remote',
      title: '组件名称',
      type: 'mainInfo',
      hover: true,
      onClick: ({ colItem }) => {
        navigate(`${baseUrl}/detail?id=${colItem.id}`);
      }
    },
    {
      name: 'name',
      title: '显示名称',
      type: 'text',
      valueOf: item => {
        return item.name || '-';
      }
    },
    {
      name: 'group',
      title: '分类',
      valueOf: item => {
        const group = item.group || 'common';
        return <Tag color={GROUP_COLORS[group] || 'default'}>{GROUP_LABELS[group] || group}</Tag>;
      }
    },
    {
      name: 'packageName',
      title: 'NPM包名',
      type: 'text',
      valueOf: item => {
        return item.packageName || '-';
      }
    },
    {
      name: 'defaultVersion',
      title: '默认版本',
      type: 'text',
      valueOf: item => {
        return item.defaultVersion || '-';
      }
    },
    {
      name: 'isPublic',
      title: '是否公开',
      type: 'tag',
      valueOf: item => {
        return item.isPublic ? { type: 'success', text: '公开' } : { type: 'default', text: '私密' };
      }
    },
    {
      name: 'createdAt',
      title: '创建时间',
      type: 'datetime'
    }
  ];
};

export default getColumns;
