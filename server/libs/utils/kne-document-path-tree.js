const buildPathTree = relativePaths => {
  const nodes = new Map();
  let id = 1;

  const ensureNode = (code, name, parentCode) => {
    if (nodes.has(code)) {
      return nodes.get(code);
    }
    const parentNode = parentCode ? nodes.get(parentCode) : null;
    const node = {
      id: id++,
      code,
      name,
      parentId: parentNode ? parentNode.id : null
    };
    nodes.set(code, node);
    return node;
  };

  (relativePaths || []).forEach(relativePath => {
    if (!relativePath || typeof relativePath !== 'string') {
      return;
    }
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      return;
    }
    parts.pop();
    let prefix = '';
    parts.forEach(part => {
      const parentCode = prefix || null;
      prefix = prefix ? `${prefix}/${part}` : part;
      ensureNode(prefix, part, parentCode);
    });
  });

  const tagsData = Array.from(nodes.values());
  const buildTree = parentId => {
    const list = tagsData.filter(item => item.parentId === parentId);
    list.forEach(item => {
      const children = buildTree(item.id);
      if (children.length > 0) {
        item.children = children;
      }
    });
    return list;
  };

  return buildTree(null);
};

module.exports = {
  buildPathTree
};
