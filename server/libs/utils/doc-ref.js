const DOC_INDEX_PREFIX = 'doc-index:';
const EXPERIENCE_PREFIX = 'experience:';
const DOCUMENT_PREFIX = 'document:';

const formatDocIndexRef = ({ docId, version, name, kind, sub }) => {
  const base = `${DOC_INDEX_PREFIX}${docId}@${version || 'latest'}#/${name}`;
  if (!kind) {
    return base;
  }
  return sub === undefined || sub === null || sub === '' ? `${base}/${kind}` : `${base}/${kind}/${sub}`;
};

// 库里的 relativePath 有的带 experience/ 前缀有的不带，ref 里统一去掉，解析时两种都试
const formatExperienceRef = relativePath => `${EXPERIENCE_PREFIX}${String(relativePath || '').replace(/^experience\//, '')}`;

const experiencePathCandidates = relativePath => {
  const clean = String(relativePath || '').replace(/^experience\//, '');
  return [clean, `experience/${clean}`];
};

const formatDocumentRef = id => `${DOCUMENT_PREFIX}${id}`;

const parseDocIndexRef = body => {
  const [head, tail] = body.split('#/');
  if (!head) {
    return null;
  }
  // docId 自身含 @（如 @kne/scroll-loader），版本取最后一个 @ 之后
  const at = head.lastIndexOf('@');
  const docId = at > 0 ? head.slice(0, at) : head;
  const version = at > 0 ? head.slice(at + 1) : null;
  if (!tail) {
    return { type: 'doc-index', docId, version, name: null, kind: null, sub: null };
  }
  const [name, kind, ...rest] = tail.split('/');
  return {
    type: 'doc-index',
    docId,
    version,
    name: name || null,
    kind: kind || null,
    sub: rest.length ? rest.join('/') : null
  };
};

const parseRef = ref => {
  const value = String(ref || '').trim();
  if (!value) {
    return null;
  }
  if (value.startsWith(DOC_INDEX_PREFIX)) {
    return parseDocIndexRef(value.slice(DOC_INDEX_PREFIX.length));
  }
  if (value.startsWith(EXPERIENCE_PREFIX)) {
    return { type: 'experience', relativePath: value.slice(EXPERIENCE_PREFIX.length) };
  }
  if (value.startsWith(DOCUMENT_PREFIX)) {
    return { type: 'document', id: value.slice(DOCUMENT_PREFIX.length) };
  }
  return null;
};

module.exports = {
  DOC_INDEX_PREFIX,
  EXPERIENCE_PREFIX,
  DOCUMENT_PREFIX,
  formatDocIndexRef,
  formatExperienceRef,
  experiencePathCandidates,
  formatDocumentRef,
  parseRef
};
