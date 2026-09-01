const LEGACY_RENDER_TYPE = {
  serialNumber: 'id',
  mainInfo: 'main',
  tag: 'tag',
  description: 'description',
  options: 'options'
};

const convertLegacyColumns = (columns = []) => {
  return columns.map(column => {
    const { type, valueOf, onClick, primary, hover, ...rest } = column;
    const next = { ...rest };

    if (type === 'datetime') {
      next.format = 'datetime';
    } else if (type && LEGACY_RENDER_TYPE[type]) {
      next.renderType = LEGACY_RENDER_TYPE[type];
    }

    if (typeof valueOf === 'function') {
      next.getValueOf = valueOf;
    }

    if (typeof onClick === 'function') {
      next.onClick = onClick;
    }

    if (primary && !next.renderType && next.name === 'id') {
      next.renderType = 'id';
    }

    return next;
  });
};

export default convertLegacyColumns;
