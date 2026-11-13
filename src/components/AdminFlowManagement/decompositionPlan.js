/**
 * 开发任务拆分 / 任务拆分方案的展示整理：只读真实交付物数据，不改存储、不编造任务。
 *
 * 真实口径（validateOptions）：这两个模板是 jsonb，options[].type 只能是 file / url / text，
 * label 必填；text 的 content 是正文。裂变出稿 children 字段是 title / scope / priority / ownerUserId / nodeType。
 * 展示时按上述实际字段与正文里已写出的「范围/目标/状态/负责人/依赖/验收」标签整理；
 * 纯 Markdown 仅在同一级出现 2 个及以上标题时按标题分条，否则整段作为说明，不把一段话拆成假任务。
 */

const DECOMPOSITION_TEMPLATE_CODES = Object.freeze(['decomposition_plan', 'design_decomposition']);

const GENERIC_LABELS = new Set(
  ['开发任务拆分', '任务拆分方案', '开发计划拆分', '需求分解方案', '内容', '正文', '说明', '文档', '任务列表', '拆分方案', '材料', 'task breakdown', 'development breakdown', 'content', 'body', 'description'].map(item => item.toLowerCase())
);

const FIELD_KEYS = Object.freeze(['scope', 'goal', 'status', 'owner', 'priority', 'depends', 'acceptance']);

const LABEL_TO_FIELD = {
  范围: 'scope',
  模块边界: 'scope',
  模块: 'scope',
  scope: 'scope',
  目标: 'goal',
  goal: 'goal',
  状态: 'status',
  status: 'status',
  负责人: 'owner',
  owner: 'owner',
  owneruserid: 'owner',
  优先级: 'priority',
  priority: 'priority',
  依赖: 'depends',
  依赖项: 'depends',
  depends: 'depends',
  dependencies: 'depends',
  dependency: 'depends',
  验收: 'acceptance',
  验收标准: 'acceptance',
  acceptance: 'acceptance',
  acceptcriteria: 'acceptance'
};

const isPresent = value => {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const optionType = option => {
  if (!option) return 'text';
  const type = option.type;
  if (type && typeof type === 'object') {
    if (type.value != null && type.value !== '') return String(type.value);
    if (type.id != null && type.id !== '') return String(type.id);
  }
  return type != null && type !== '' ? String(type) : 'text';
};

const isGenericLabel = label =>
  GENERIC_LABELS.has(
    String(label || '')
      .trim()
      .toLowerCase()
  );

const tryParseJson = text => {
  const value = String(text || '').trim();
  if (!value || (value[0] !== '{' && value[0] !== '[')) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const joinValue = value => {
  if (Array.isArray(value))
    return value
      .map(item => (item == null ? '' : String(item).trim()))
      .filter(Boolean)
      .join('、');
  return String(value).trim();
};

const taskFromObject = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = raw.title || raw.name || raw.label;
  if (!isPresent(title) || typeof title !== 'string' || !String(title).trim()) return null;
  const task = { title: String(title).trim() };
  const mapped = {
    scope: raw.scope,
    goal: raw.goal,
    status: raw.status,
    owner: raw.owner || raw.ownerUserId || raw.ownerName,
    priority: raw.priority,
    depends: raw.depends || raw.dependencies || raw.dependency,
    acceptance: raw.acceptance || raw.acceptCriteria || raw.accept_criteria,
    nodeType: raw.nodeType,
    remark: raw.remark
  };
  if (!isPresent(mapped.scope) && isPresent(raw.description)) mapped.scope = raw.description;
  Object.keys(mapped).forEach(key => {
    if (isPresent(mapped[key])) task[key] = joinValue(mapped[key]);
  });
  return task;
};

const tasksFromJson = data => {
  if (data == null) return null;
  const list = Array.isArray(data) ? data : Array.isArray(data.children) ? data.children : Array.isArray(data.tasks) ? data.tasks : Array.isArray(data.items) ? data.items : Array.isArray(data.adding) ? data.adding : null;
  if (!list) return null;
  const tasks = list.map(taskFromObject).filter(Boolean);
  return tasks.length ? tasks : null;
};

const FIELD_LABEL_RE = /^(范围|目标|优先级|负责人|依赖项|依赖|验收标准|验收|状态|模块边界|模块|scope|goal|priority|owner|depends|dependencies|dependency|acceptance|status|acceptCriteria)\s*[:：]\s*(.*)$/i;

const resolveField = label =>
  LABEL_TO_FIELD[
    String(label || '')
      .trim()
      .toLowerCase()
  ] ||
  LABEL_TO_FIELD[String(label || '').trim()] ||
  null;

const extractLabeledFields = text => {
  const raw = String(text || '').trim();
  if (!raw) return { rest: '', hasStructured: false };
  const fields = {};
  const rest = [];
  let current = null;
  raw.split(/\r?\n/).forEach(line => {
    const match = line.match(FIELD_LABEL_RE);
    if (match) {
      current = resolveField(match[1]);
      if (current) {
        const value = String(match[2] || '').trim();
        fields[current] = fields[current] ? `${fields[current]}\n${value}` : value;
      }
      return;
    }
    if (current && /^\s+\S/.test(line)) {
      fields[current] = `${fields[current] || ''}\n${line.trim()}`.trim();
      return;
    }
    current = null;
    rest.push(line);
  });
  return { ...fields, rest: rest.join('\n').trim(), hasStructured: FIELD_KEYS.some(key => isPresent(fields[key])) };
};

const applyFields = (task, body, preferStructured) => {
  const fields = extractLabeledFields(body);
  FIELD_KEYS.forEach(key => {
    if (fields[key]) task[key] = fields[key];
  });
  const leftover = preferStructured && fields.hasStructured ? fields.rest : fields.hasStructured ? fields.rest : body;
  const prose = leftover && leftover.trim();
  if (prose) {
    if (task.scope) task.body = prose;
    else task.scope = prose;
  }
  return task;
};

const parseMarkdownTasks = text => {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const all = [];
  const anyHeading = /^(#{1,3})\s+(.+?)\s*$/gm;
  let match;
  while ((match = anyHeading.exec(raw))) {
    all.push({ level: match[1].length, title: match[2].trim(), start: match.index, end: match.index + match[0].length });
  }
  const level = [1, 2, 3].find(item => all.filter(entry => entry.level === item).length >= 2);
  if (!level) return null;
  const headings = all.filter(entry => entry.level === level);
  if (headings.length < 2) return null;
  const lead = raw.slice(0, headings[0].start).trim();
  const tasks = headings.map((heading, index) => {
    const body = raw.slice(heading.end, index + 1 < headings.length ? headings[index + 1].start : raw.length).trim();
    return applyFields({ title: heading.title }, body, true);
  });
  return { lead, tasks };
};

const parseDecompositionDeliverable = item => {
  if (!item || !DECOMPOSITION_TEMPLATE_CODES.includes(item.templateCode)) {
    return { kind: 'skip' };
  }
  const options = Array.isArray(item.options) ? item.options : [];
  if (!options.length) {
    return { kind: 'empty', tasks: [], materials: [], lead: '' };
  }

  const tasks = [];
  const materials = [];
  const leads = [];

  options.forEach(option => {
    const type = optionType(option);
    const label = option && option.label != null ? String(option.label).trim() : '';
    const remark = option && option.remark != null ? String(option.remark).trim() : '';

    if (type === 'file' || type === 'url') {
      materials.push(option);
      return;
    }

    const content = option && option.content != null ? String(option.content).trim() : '';
    if (!content && !label) return;

    const jsonTasks = tasksFromJson(tryParseJson(content));
    if (jsonTasks) {
      jsonTasks.forEach(task => {
        if (remark && !task.remark) task.remark = remark;
        tasks.push(task);
      });
      return;
    }

    const markdown = parseMarkdownTasks(content);
    if (markdown && markdown.tasks.length >= 2) {
      if (markdown.lead) leads.push(markdown.lead);
      const group = label && !isGenericLabel(label) ? label : '';
      markdown.tasks.forEach(task => {
        if (group && group !== task.title) task.group = group;
        if (remark && !task.remark) task.remark = remark;
        tasks.push(task);
      });
      return;
    }

    if (label && !isGenericLabel(label)) {
      const task = applyFields({ title: label }, content, true);
      if (remark) task.remark = remark;
      tasks.push(task);
      return;
    }

    if (content) {
      materials.push(option);
    }
  });

  const lead = leads.join('\n\n');
  if (!tasks.length) {
    return { kind: 'materials', tasks: [], materials, lead };
  }
  return { kind: 'tasks', tasks, materials, lead };
};

const otherKeys = (value, skip) => {
  const extras = {};
  Object.keys(value || {}).forEach(key => {
    if (!skip.includes(key) && isPresent(value[key])) extras[key] = value[key];
  });
  return extras;
};

const parseDecompositionOutput = value => {
  if (value == null || value === '') return { kind: 'empty' };
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    if (parsed) return parseDecompositionOutput(parsed);
    const markdown = parseMarkdownTasks(value);
    if (markdown && markdown.tasks.length >= 2) {
      return { kind: 'tasks', tasks: markdown.tasks, materials: [], lead: markdown.lead || '' };
    }
    return { kind: 'text', text: value };
  }
  if (typeof value !== 'object') return { kind: 'unknown', raw: value };

  const jsonTasks = tasksFromJson(value);
  if (jsonTasks) {
    return { kind: 'tasks', tasks: jsonTasks, materials: [], lead: value.rationale || value.summary || '' };
  }

  if (isPresent(value.confirmationId) || isPresent(value.nodeIds)) {
    return {
      kind: 'applied',
      confirmationId: isPresent(value.confirmationId) ? String(value.confirmationId) : '',
      nodeIds: Array.isArray(value.nodeIds) ? value.nodeIds.map(item => String(item)) : [],
      extras: otherKeys(value, ['confirmationId', 'nodeIds'])
    };
  }

  return { kind: 'unknown', raw: value };
};

module.exports = {
  DECOMPOSITION_TEMPLATE_CODES,
  isDecompositionTemplate: code => DECOMPOSITION_TEMPLATE_CODES.includes(code),
  parseDecompositionDeliverable,
  parseDecompositionOutput,
  extractLabeledFields,
  tasksFromJson,
  optionType
};
