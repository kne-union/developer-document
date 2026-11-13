/**
 * 开发任务拆分 / 任务拆分方案的展示：任务名是主信息，范围与事实分层，条目有边界。
 * 只渲染解析结果里实际存在的字段；附件仍走既有文件预览策略。
 * 不用色标签堆砌，不加左侧装饰条，不改存储数据。
 */
import { Typography } from 'antd';
import { FlowCardMeta } from '../FlowCardHeader';
import { FileAttachmentPreview, MarkdownWithAttachments } from './FileAttachmentPreview';
import { isInPageUrlPreviewTemplate, PREVIEW_PRESENTATION, resolveFilePreviewPresentation } from '../deliverablePreview';
import { selectValueOf } from '../selectValue';
import { PRIORITY_COLOR, priorityMessageId } from '../constants';
import { parseDecompositionOutput } from '../decompositionPlan';
import styles from '../style.module.scss';

const PRIORITY_CODES = ['low', 'medium', 'high', 'urgent'];

const Prose = ({ text, FilePreview, FileButton, FileDownload, formatMessage, emptyContent, className }) => {
  if (!text) return null;
  return (
    <div className={className}>
      <MarkdownWithAttachments text={text} presentation={PREVIEW_PRESENTATION.MODAL} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
    </div>
  );
};

const Fact = ({ label, children }) => {
  if (children == null || children === '') return null;
  return (
    <dl className={styles.decompFact}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </dl>
  );
};

const priorityMeta = (value, formatMessage) => {
  if (!value) return null;
  const code = String(value).trim().toLowerCase();
  if (PRIORITY_CODES.includes(code)) {
    return { key: 'priority', tone: PRIORITY_COLOR[code] || 'default', children: formatMessage({ id: priorityMessageId(code), defaultMessage: value }) };
  }
  return { key: 'priority', children: value };
};

const TaskItem = ({ task, index, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  const metaItems = [task.status ? { key: 'status', children: task.status } : null, priorityMeta(task.priority, formatMessage), task.owner ? { key: 'owner', children: task.owner } : null];
  return (
    <li className={styles.decompTask}>
      <div className={styles.decompTaskHead}>
        <span className={styles.decompIndex} aria-hidden="true">
          {index + 1}
        </span>
        <h4 className={styles.decompTitle}>{task.title}</h4>
      </div>
      {task.scope ? <Prose text={task.scope} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} className={styles.decompScope} /> : null}
      {task.goal ? <Fact label={formatMessage({ id: 'adminFlow.ai.goal' })}>{task.goal}</Fact> : null}
      <FlowCardMeta items={metaItems} className={styles.decompMeta} />
      {task.depends ? <Fact label={formatMessage({ id: 'adminFlow.decomposition.depends' })}>{task.depends}</Fact> : null}
      {task.acceptance ? <Fact label={formatMessage({ id: 'adminFlow.deliverable.acceptCriteria' })}>{task.acceptance}</Fact> : null}
      {task.body ? <Prose text={task.body} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} className={styles.decompBody} /> : null}
      {task.remark ? <p className={styles.decompRemark}>{task.remark}</p> : null}
    </li>
  );
};

const MaterialList = ({ items, templateCode, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  if (!items || !items.length) return null;
  return (
    <ul className={styles.decompMaterials}>
      {items.map((item, index) => {
        const type = selectValueOf(item.type) || 'text';
        const presentation = resolveFilePreviewPresentation({ templateCode, entryKind: 'option_file' });
        return (
          <li key={item.fileId || item.url || item.label || index} className={styles.decompMaterial}>
            {item.label ? <div className={styles.decompMaterialLabel}>{item.label}</div> : null}
            {type === 'url' && item.url ? (
              isInPageUrlPreviewTemplate(templateCode) ? (
                <FileAttachmentPreview presentation={PREVIEW_PRESENTATION.INLINE} src={item.url} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
              ) : (
                <a className={styles.contentLink} href={item.url} target="_blank" rel="noreferrer">
                  {item.url}
                </a>
              )
            ) : null}
            {type === 'file' && (item.fileName || item.fileId) ? (
              <FileAttachmentPreview
                presentation={presentation}
                fileId={item.fileId}
                fileName={item.fileName}
                FilePreview={FilePreview}
                FileButton={FileButton}
                FileDownload={FileDownload}
                formatMessage={formatMessage}
                emptyContent={emptyContent}
              />
            ) : null}
            {type === 'text' && item.content ? (
              <Prose text={item.content} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} className={styles.decompBody} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

const groupedTasks = tasks => {
  const groups = [];
  (tasks || []).forEach(task => {
    const name = task.group || '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.tasks.push(task);
    else groups.push({ name, tasks: [task] });
  });
  return groups;
};

export const DecompositionPlanView = ({ parsed, templateCode, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  if (!parsed || parsed.kind === 'empty' || (parsed.kind === 'tasks' && !(parsed.tasks || []).length && !(parsed.materials || []).length)) {
    return typeof emptyContent === 'function' ? emptyContent() : emptyContent || null;
  }
  const groups = groupedTasks(parsed.tasks || []);
  let index = 0;
  return (
    <div className={styles.decompPlan}>
      {parsed.lead ? <Prose text={parsed.lead} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} className={styles.decompLead} /> : null}
      {groups.length ? (
        <ol className={styles.decompList}>
          {groups.map((group, groupIndex) => (
            <li key={`g-${groupIndex}`} className={group.name ? styles.decompGroup : styles.decompGroupPlain}>
              {group.name ? <h5 className={styles.decompGroupTitle}>{group.name}</h5> : null}
              <ol className={styles.decompGroupList}>
                {group.tasks.map(task => {
                  const current = index;
                  index += 1;
                  return <TaskItem key={`${task.title}-${current}`} task={task} index={current} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
                })}
              </ol>
            </li>
          ))}
        </ol>
      ) : null}
      <MaterialList items={parsed.materials} templateCode={templateCode} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
    </div>
  );
};

export const DecompositionOutputView = ({ value, formatMessage, unknownFallback }) => {
  const parsed = parseDecompositionOutput(value);
  if (parsed.kind === 'empty') return null;
  if (parsed.kind === 'applied') {
    return (
      <dl className={styles.contextFieldList}>
        {parsed.confirmationId ? (
          <div className={styles.contextFieldRow}>
            <dt>{formatMessage({ id: 'adminFlow.decomposition.confirmationId' })}</dt>
            <dd>
              <Typography.Text className={styles.contextCodeInline} copyable={{ text: parsed.confirmationId }}>
                {parsed.confirmationId}
              </Typography.Text>
            </dd>
          </div>
        ) : null}
        {parsed.nodeIds && parsed.nodeIds.length ? (
          <div className={styles.contextFieldRow}>
            <dt>{formatMessage({ id: 'adminFlow.decomposition.nodeIds' })}</dt>
            <dd>{parsed.nodeIds.join('、')}</dd>
          </div>
        ) : null}
      </dl>
    );
  }
  if (parsed.kind === 'text') {
    return <pre className={styles.contextCode}>{parsed.text}</pre>;
  }
  if (parsed.kind === 'tasks') {
    return <DecompositionPlanView parsed={parsed} formatMessage={formatMessage} />;
  }
  if (typeof unknownFallback === 'function') return unknownFallback(parsed.raw);
  return null;
};

export default DecompositionPlanView;
