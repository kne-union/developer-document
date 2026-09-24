import { isValidElement } from 'react';
import classnames from 'classnames';
import { Checkbox, Flex, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import get from 'lodash/get';
import RemoteLoader from '@kne/remote-loader';
import style from './adminListCards.module.scss';

const { Text, Paragraph } = Typography;

/** 标题优先：人类可读名 > 技术标识；永不优先 id */
const TITLE_NAME_PRIORITY = ['title', 'label', 'packageName', 'remote', 'query', 'version', 'name', 'key'];
/** 副标题：技术标识 / 路径类 */
const SUBTITLE_NAME_PRIORITY = ['packageName', 'remote', 'name', 'relativePath', 'key', 'appName'];
/** 状态类标签优先 */
const STATUS_TAG_NAMES = new Set(['status', 'current', 'secret']);
/** 分类 / 可见性等次要标签 */
const SECONDARY_TAG_NAMES = new Set(['group', 'groups', 'type', 'category', 'channel', 'isPublic']);
/** 卡片上不展示的字段 */
const SKIP_FIELD_NAMES = new Set(['id', 'options', 'icon', 'message', 'pathUrl', 'examples', 'registry']);
/** 时间字段：最多保留一个 */
const TIME_FIELD_NAMES = ['updatedAt', 'writtenAt', 'publishTime', 'fetchedAt', 'createdAt', 'joinDate'];
/** 人字段：最多保留一个 */
const ACTOR_FIELD_NAMES = ['createdUser', 'updatedUser', 'creator', 'author'];
/** 版本 / 端口等技术 meta */
const TECH_META_NAMES = ['latestVersion', 'defaultVersion', 'version', 'port', 'domain', 'projectName', 'meta'];

const BLANK = new Set(['', '-', '—', '–', '/', 'n/a', 'na', 'null', 'undefined']);

const isOptionsColumn = col => col?.name === 'options' || col?.renderType === 'options';
const isMainColumn = col => col?.renderType === 'main' || col?.primary || col?.hover;
const isTagColumn = col => col?.renderType === 'tag' || col?.renderType === 'tagList' || col?.renderType === 'status';
const isDescColumn = col => col?.renderType === 'description' || col?.name === 'description' || col?.name === 'summary' || col?.name === 'relativePath';

const isBlank = value => {
  if (value == null || value === false) return true;
  if (typeof value === 'number') return false;
  if (typeof value !== 'string') return false;
  const text = String(value).trim();
  return !text || BLANK.has(text.toLowerCase());
};

const isEmptyNode = node => {
  if (node == null || node === false) return true;
  if (typeof node === 'string' || typeof node === 'number') return isBlank(node);
  if (!isValidElement(node)) return false;
  const children = node.props?.children;
  if (children == null || children === false) return true;
  if (typeof children === 'string' || typeof children === 'number') return isBlank(children);
  if (Array.isArray(children)) {
    const meaningful = children.filter(child => child != null && child !== false);
    if (!meaningful.length) return true;
    if (meaningful.every(child => isEmptyNode(child))) return true;
  }
  return false;
};

/**
 * 卡片取值：优先 getValueOf / 字段原值。
 * 禁止优先走 Table 注入的 render（空单元格会变成 "-" / 空 Tag）。
 */
const resolveRaw = (column, item) => {
  if (!column) return null;
  if (typeof column.getValueOf === 'function') {
    const value = column.getValueOf(item, { place: 'card', name: column.name });
    if (!isBlank(value) || value === 0 || value === false || typeof value === 'object') {
      return value;
    }
  }
  const direct = get(item, column.name);
  if (direct != null && !isBlank(direct)) {
    return direct;
  }
  // 无字段值时，仅对「作者自定义 render」（非 main/tag 注入）兜底，例如 type 列直接画 Tag
  if (typeof column.render === 'function' && !isMainColumn(column) && !isTagColumn(column)) {
    try {
      return column.render(direct, { dataSource: item, colItem: item, name: column.name });
    } catch (e) {
      return null;
    }
  }
  return direct == null ? null : direct;
};

const formatScalar = (value, column) => {
  if (isBlank(value) && value !== 0) return null;
  if (column?.format === 'datetime' || column?.format === 'date' || TIME_FIELD_NAMES.includes(column?.name)) {
    const d = dayjs(value);
    if (d.isValid()) {
      return d.format(column?.format === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
    }
  }
  if (typeof value === 'object') return null;
  const text = String(value).trim();
  return isBlank(text) ? null : text;
};

const extractTagPayload = value => {
  if (value == null || value === false) return null;
  if (isValidElement(value)) {
    if (isEmptyNode(value)) return null;
    const children = value.props?.children;
    const text = typeof children === 'string' || typeof children === 'number' ? String(children).trim() : null;
    if (text && isBlank(text)) return null;
    return { node: value, text };
  }
  if (Array.isArray(value)) {
    const list = value.map(extractTagPayload).filter(Boolean);
    return list.length ? { list } : null;
  }
  if (typeof value === 'object') {
    const text = value.text ?? value.label;
    if (isBlank(text)) return null;
    return {
      text: String(text).trim(),
      color: value.color || value.type || 'default'
    };
  }
  const text = formatScalar(value);
  return text ? { text, color: 'default' } : null;
};

const renderTagNode = payload => {
  if (!payload) return null;
  if (payload.node) return payload.node;
  if (payload.list) {
    return (
      <Flex gap={4} wrap="wrap" className={style['tag-group']}>
        {payload.list.slice(0, 3).map((item, i) => (
          <span key={i}>{renderTagNode(item)}</span>
        ))}
      </Flex>
    );
  }
  return (
    <Tag color={payload.color || 'default'} className={style['tag']}>
      {payload.text}
    </Tag>
  );
};

const renderValue = (column, item, { asTag = false } = {}) => {
  const raw = resolveRaw(column, item);
  if (raw == null || raw === false || raw === '') return null;
  if (isValidElement(raw)) return isEmptyNode(raw) ? null : raw;
  if (asTag || isTagColumn(column)) {
    return renderTagNode(extractTagPayload(raw));
  }
  if (typeof raw === 'object' && (raw.text != null || raw.label != null)) {
    return renderTagNode(extractTagPayload(raw));
  }
  return formatScalar(raw, column);
};

const pickByNamePriority = (fields, names) => {
  for (const name of names) {
    const hit = fields.find(col => col.name === name);
    if (hit) return hit;
  }
  return null;
};

const pickTitleColumn = fields => {
  const mains = fields.filter(isMainColumn);
  const byPriority = pickByNamePriority(mains, TITLE_NAME_PRIORITY);
  if (byPriority) return byPriority;
  const nonId = mains.find(col => col.name !== 'id');
  if (nonId) return nonId;
  return pickByNamePriority(fields, TITLE_NAME_PRIORITY) || fields.find(col => col.name !== 'id') || null;
};

const isTechIdentifierName = name => SUBTITLE_NAME_PRIORITY.includes(name) || name === 'packageName' || name === 'remote';

const pickSubtitleColumn = (fields, titleColumn) => {
  const candidates = fields.filter(col => col && col !== titleColumn && col.name !== 'id');
  const byPriority = pickByNamePriority(
    candidates.filter(col => isMainColumn(col) || isTechIdentifierName(col.name)),
    SUBTITLE_NAME_PRIORITY
  );
  if (byPriority && byPriority.name !== titleColumn?.name) return byPriority;
  return null;
};

const resolveTitle = (fields, titleColumn, item) => {
  const ordered = [titleColumn, ...TITLE_NAME_PRIORITY.map(name => fields.find(col => col.name === name)).filter(Boolean), ...fields.filter(isMainColumn)].filter((col, index, arr) => col && arr.indexOf(col) === index && col.name !== 'id');

  for (const col of ordered) {
    const value = renderValue(col, item);
    if (value && !isBlank(value) && !isEmptyNode(value)) {
      return { value, column: col };
    }
  }
  return { value: null, column: titleColumn };
};

const classifyTagColumn = col => {
  if (!col) return null;
  if (STATUS_TAG_NAMES.has(col.name) || col.renderType === 'status') return 'status';
  if (SECONDARY_TAG_NAMES.has(col.name) || isTagColumn(col) || col.name === 'type') return 'secondary';
  // 自定义 render 产出 Tag 的列（如 npm type）
  if (typeof col.render === 'function' && !isMainColumn(col) && !isDescColumn(col)) return 'secondary';
  return null;
};

const pickTagColumns = (fields, usedNames) => {
  const status = [];
  const secondary = [];
  fields.forEach(col => {
    if (!col || usedNames.has(col.name) || SKIP_FIELD_NAMES.has(col.name)) return;
    const kind = classifyTagColumn(col);
    if (kind === 'status') status.push(col);
    else if (kind === 'secondary') secondary.push(col);
  });
  // 状态最多 1，次要最多 1（分类 / 公开性），总共不超过 2
  return [...status.slice(0, 1), ...secondary.slice(0, 1)];
};

const pickDescColumn = (fields, usedNames) => {
  const desc = fields.find(col => isDescColumn(col) && !usedNames.has(col.name));
  return desc || null;
};

const metaPriorityScore = col => {
  const name = col?.name;
  if (TECH_META_NAMES.includes(name)) return 10;
  if (ACTOR_FIELD_NAMES.includes(name)) return 20;
  if (TIME_FIELD_NAMES.includes(name)) return 30;
  return 50;
};

const pickMetaColumns = (fields, usedNames) => {
  const candidates = fields
    .filter(col => col && !usedNames.has(col.name) && !SKIP_FIELD_NAMES.has(col.name) && !isMainColumn(col) && !isTagColumn(col) && !isDescColumn(col) && classifyTagColumn(col) == null)
    .sort((a, b) => metaPriorityScore(a) - metaPriorityScore(b));

  const picked = [];
  let hasTime = false;
  let hasActor = false;
  for (const col of candidates) {
    if (picked.length >= 3) break;
    if (TIME_FIELD_NAMES.includes(col.name)) {
      if (hasTime) continue;
      hasTime = true;
    }
    if (ACTOR_FIELD_NAMES.includes(col.name)) {
      if (hasActor) continue;
      hasActor = true;
    }
    picked.push(col);
  }
  return picked;
};

/** 时间 / 邮箱等可自解释时弱化 label */
const shouldOmitMetaLabel = col => TIME_FIELD_NAMES.includes(col?.name) || ACTOR_FIELD_NAMES.includes(col?.name);

const formatActorValue = value => {
  if (value == null) return null;
  if (typeof value === 'object') {
    return value.nickname || value.email || value.name || null;
  }
  return formatScalar(value);
};

const getActions = (optionsColumn, item) => {
  if (!optionsColumn?.getValueOf) return null;
  const value = optionsColumn.getValueOf(item, { place: 'end' });
  if (isValidElement(value)) return isEmptyNode(value) ? null : value;
  if (value?.children) return isEmptyNode(value.children) ? null : value.children;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return <RemoteLoader module="components-core:ButtonGroup" moreType="link" list={value} />;
  }
  if (value?.list) {
    return <RemoteLoader module="components-core:ButtonGroup" moreType="link" {...value} />;
  }
  return null;
};

const createAdminListCards = () => {
  return ({ dataSource, displayDataSource, columns, renderToolbar, rowSelection, getSelectionProps, getRowKey }) => {
    const list = Array.isArray(displayDataSource) ? displayDataSource : Array.isArray(dataSource) ? dataSource : [];
    const fields = (columns || []).filter(col => col && !isOptionsColumn(col));
    const optionsColumn = (columns || []).find(isOptionsColumn) || null;
    const titleColumn = pickTitleColumn(fields);
    const showSelection = !!(rowSelection && typeof getSelectionProps === 'function');

    return (
      <div className={style['market']}>
        {typeof renderToolbar === 'function' ? renderToolbar() : null}
        {list.length === 0 ? null : (
          <div className={style['grid']}>
            {list.map((item, index) => {
              const rowKey = typeof getRowKey === 'function' ? getRowKey(item) : (item?.id ?? item?.name ?? item?.packageName ?? index);
              const selection = showSelection ? getSelectionProps(item) : null;

              const { value: titleNode, column: usedTitleCol } = resolveTitle(fields, titleColumn, item);
              const subtitleCol = pickSubtitleColumn(fields, usedTitleCol);
              let subtitleNode = subtitleCol ? renderValue(subtitleCol, item) : null;
              if (subtitleNode && (isBlank(subtitleNode) || isEmptyNode(subtitleNode))) subtitleNode = null;
              // 副标题与标题相同则隐藏
              if (subtitleNode && titleNode && String(subtitleNode) === String(titleNode)) subtitleNode = null;

              const usedNames = new Set([usedTitleCol?.name, subtitleCol?.name].filter(Boolean));
              const tagColumns = pickTagColumns(fields, usedNames);
              tagColumns.forEach(col => usedNames.add(col.name));

              const descCol = pickDescColumn(fields, usedNames);
              if (descCol) usedNames.add(descCol.name);
              let descNode = descCol ? renderValue(descCol, item) : null;
              if (descNode && (isBlank(descNode) || isEmptyNode(descNode))) descNode = null;

              const metaColumns = pickMetaColumns(fields, usedNames);
              const tagNodes = tagColumns
                .map(col => {
                  const node = renderValue(col, item, { asTag: true });
                  if (!node || isEmptyNode(node)) return null;
                  return { key: col.name, node };
                })
                .filter(Boolean);

              const metaNodes = metaColumns
                .map(col => {
                  let value;
                  if (ACTOR_FIELD_NAMES.includes(col.name)) {
                    const raw = resolveRaw(col, item);
                    value = formatActorValue(raw) || renderValue(col, item);
                  } else {
                    value = renderValue(col, item);
                  }
                  if (value == null || isBlank(value) || isEmptyNode(value)) return null;
                  // meta 里若是 Tag 元素，只取文案，避免再套一层标签感
                  if (isValidElement(value)) {
                    const children = value.props?.children;
                    if (typeof children === 'string' || typeof children === 'number') {
                      value = String(children);
                    }
                  }
                  return {
                    key: col.name,
                    label: shouldOmitMetaLabel(col) ? null : col.title,
                    value
                  };
                })
                .filter(Boolean);

              const actions = getActions(optionsColumn, item);
              const clickable = typeof usedTitleCol?.onClick === 'function';
              const subtitleIsTech = subtitleCol && isTechIdentifierName(subtitleCol.name);

              return (
                <article
                  key={rowKey}
                  className={classnames(style['card'], {
                    [style['is-selected']]: !!selection?.checked,
                    [style['is-clickable']]: clickable
                  })}
                  onClick={() => {
                    if (clickable) usedTitleCol.onClick({ colItem: item, dataSource: item });
                  }}
                >
                  <Flex gap={12} align="flex-start" className={style['card-main']}>
                    {selection ? (
                      <div
                        className={style['selection']}
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <Checkbox checked={selection.checked} indeterminate={selection.indeterminate} disabled={selection.disabled} onChange={selection.onChange} />
                      </div>
                    ) : null}
                    <div className={style['card-body']}>
                      <div className={style['title-block']}>
                        {titleNode ? (
                          <Text strong className={style['title']} ellipsis>
                            {titleNode}
                          </Text>
                        ) : (
                          <Text type="secondary" className={style['title-fallback']}>
                            —
                          </Text>
                        )}
                        {subtitleNode ? (
                          <Text type="secondary" className={classnames(style['subtitle'], { [style['subtitle-tech']]: subtitleIsTech })} ellipsis>
                            {subtitleNode}
                          </Text>
                        ) : null}
                      </div>

                      {tagNodes.length > 0 ? (
                        <div className={style['tag-row']}>
                          {tagNodes.map(entry => (
                            <span key={entry.key} className={style['tag-slot']}>
                              {entry.node}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {descNode ? (
                        <Paragraph type="secondary" className={style['desc']} ellipsis={{ rows: 2 }}>
                          {descNode}
                        </Paragraph>
                      ) : null}

                      {metaNodes.length > 0 ? (
                        <div className={style['meta']}>
                          {metaNodes.map((entry, i) => (
                            <span key={entry.key} className={style['meta-item']}>
                              {i > 0 ? <span className={style['meta-dot']} aria-hidden /> : null}
                              {entry.label ? <span className={style['meta-label']}>{entry.label}</span> : null}
                              <span className={style['meta-value']}>{entry.value}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Flex>

                  {actions ? (
                    <Flex
                      className={style['card-footer']}
                      justify="flex-end"
                      onClick={e => {
                        e.stopPropagation();
                      }}
                    >
                      <div className={style['card-actions']}>{actions}</div>
                    </Flex>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };
};

export default createAdminListCards;
