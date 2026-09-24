import StatusTag from '../StatusTag';

const goAppDetail = (navigate, item) => {
  if (!navigate || !item?.name) {
    return;
  }
  navigate(`detail?name=${encodeURIComponent(item.name)}`);
};

const getColumns = ({ navigate, formatMessage, Image }) => {
  return [
    {
      name: 'icon',
      title: formatMessage({ id: 'common.icon' }),
      width: 72,
      render: (_, { dataSource }) => (dataSource.icon ? <Image.Avatar id={dataSource.icon} alt={dataSource.label || dataSource.name} size={36} shape="square" /> : null)
    },
    {
      name: 'label',
      title: formatMessage({ id: 'appManager.columns.label' }),
      renderType: 'main',
      primary: true,
      hover: true,
      onClick: ({ colItem }) => goAppDetail(navigate, colItem),
      getValueOf: item => item.label || item.name || null
    },
    {
      name: 'name',
      title: formatMessage({ id: 'appManager.columns.name' }),
      renderType: 'main',
      hover: true,
      onClick: ({ colItem }) => goAppDetail(navigate, colItem),
      getValueOf: item => item.name || null
    },
    {
      name: 'status',
      title: formatMessage({ id: 'common.status' }),
      render: (_, { dataSource }) => <StatusTag status={dataSource.status} />
    },
    {
      name: 'port',
      title: formatMessage({ id: 'appManager.columns.port' }),
      getValueOf: item => item.port || null
    },
    {
      name: 'pathUrl',
      title: formatMessage({ id: 'appManager.columns.pathUrl' }),
      render: (_, { dataSource }) => {
        if (!dataSource.pathUrl) {
          return null;
        }
        return (
          <a href={dataSource.pathUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
            {dataSource.pathUrl}
          </a>
        );
      }
    },
    {
      name: 'domain',
      title: formatMessage({ id: 'appManager.columns.domain' }),
      getValueOf: item => item.domain || null
    },
    {
      name: 'message',
      title: formatMessage({ id: 'appManager.columns.message' }),
      ellipsis: true,
      getValueOf: item => item.message || null
    }
  ];
};

export default getColumns;
