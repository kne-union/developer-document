import { useEffect, useMemo, useState } from 'react';
import { App, Button, Collapse, Empty, Spin, Tag, Timeline, Typography } from 'antd';
import { CheckCircleFilled, CopyOutlined, LinkOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { contentTypeMessageId, DELIVERABLE_STATUS_COLOR, deliverableStatusMessageId, producedByMessageId, queueGoalMessageId, stageMessageId, templateNameId, toCamel } from '../constants';
import { TEST_CASES_TEMPLATE, REGRESSION_TEMPLATE, buildRegressionTimeline, flattenSteps, formatShanghaiTime, hasRegressionValue, hasTestExecutionValue, parseRegressionRuns, parseTestExecution } from '../testExecution';
import { isInPageUrlPreviewTemplate, PREVIEW_PRESENTATION, resolveFilePreviewPresentation } from '../deliverablePreview';
import { defaultOpenSections, eventTone, hasDeliverableBody, isPresent, parseAiRunContext, runStatusTone, stableStringify } from '../aiRunContext';
import { EvidenceRefsList, FileAttachmentPreview, MarkdownWithAttachments } from './FileAttachmentPreview';
import { RegressionTimelineView, TestStepsView } from './TestExecutionViews';
import { selectValueOf } from '../selectValue';
import styles from '../style.module.scss';

const runStatusMessageId = status => `adminFlow.ai.status.${toCamel(status)}`;

const textOrCode = (formatMessage, id, fallback) => formatMessage({ id, defaultMessage: fallback || '' });

const formatTimeLabel = (formatted, formatMessage) => {
  if (formatted && formatted.ok) {
    return formatted.text;
  }
  if (formatted && formatted.missing) {
    return formatMessage({ id: 'adminFlow.ai.timeUnknown' });
  }
  return formatMessage({ id: 'adminFlow.ai.timeInvalid' });
};

const copyText = async (text, messageApi, formatMessage) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      messageApi.success(formatMessage({ id: 'adminFlow.ai.copied' }));
      return;
    }
    throw new Error('clipboard unavailable');
  } catch (error) {
    messageApi.error(formatMessage({ id: 'adminFlow.ai.copyFailed' }));
  }
};

const MetaItem = ({ label, children }) => {
  if (children == null || children === '') {
    return null;
  }
  return (
    <div className={styles.contextMetaItem}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
};

const OtherFields = ({ value, formatMessage }) => {
  if (!isPresent(value)) {
    return null;
  }
  return (
    <div className={styles.contextOthers}>
      <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.otherFields' })}</h4>
      <dl className={styles.contextFieldList}>
        {Object.keys(value).map(key => (
          <div key={key} className={styles.contextFieldRow}>
            <dt>{key}</dt>
            <dd>{typeof value[key] === 'string' || typeof value[key] === 'number' || typeof value[key] === 'boolean' ? String(value[key]) : <pre className={styles.contextCode}>{stableStringify(value[key])}</pre>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const ChecklistBlock = ({ rows, formatMessage }) => (
  <div className={styles.checklistWrap}>
    <div className={styles.checklistSummary}>{formatMessage({ id: 'adminFlow.deliverable.table.checklistSummary' }, { done: rows.filter(row => row.checked).length, total: rows.length })}</div>
    <ul className={styles.checklist}>
      {rows.map((row, index) => (
        <li key={index} className={row.checked ? styles.checklistItemDone : styles.checklistItem}>
          <span className={styles.checklistMark} aria-hidden="true">
            {row.checked ? <CheckCircleFilled /> : <MinusCircleOutlined />}
          </span>
          <div className={styles.checklistMain}>
            <div className={styles.checklistLabel}>{row.label || formatMessage({ id: 'adminFlow.deliverable.contentEmpty' })}</div>
            {row.remark ? <div className={styles.checklistRemark}>{row.remark}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const UrlValue = ({ url, templateCode, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  if (isInPageUrlPreviewTemplate(templateCode)) {
    return <FileAttachmentPreview presentation={PREVIEW_PRESENTATION.INLINE} src={url} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
  }
  return (
    <a className={styles.contentLink} href={url} target="_blank" rel="noreferrer">
      <LinkOutlined /> {url}
    </a>
  );
};

const OptionsBlock = ({ rows, templateCode, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => (
  <div className={styles.materialList}>
    {rows.map((row, index) => {
      const type = selectValueOf(row.type) || 'text';
      const presentation = resolveFilePreviewPresentation({ templateCode, entryKind: 'option_file' });
      return (
        <div key={index} className={styles.materialItem}>
          <div className={styles.materialItemHead}>
            <Tag className={styles.materialType} bordered={false}>
              {textOrCode(formatMessage, `adminFlow.deliverable.material.${type}`, type)}
            </Tag>
            <span className={styles.materialItemLabel}>{row.label}</span>
            {row.remark ? <span className={styles.materialItemRemark}>{row.remark}</span> : null}
          </div>
          <div className={styles.materialItemBody}>
            {type === 'text' ? (
              row.content ? (
                <MarkdownWithAttachments text={row.content} presentation={PREVIEW_PRESENTATION.MODAL} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
              ) : (
                emptyContent()
              )
            ) : null}
            {type === 'url' ? (
              row.url ? (
                <UrlValue url={row.url} templateCode={templateCode} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
              ) : (
                emptyContent()
              )
            ) : null}
            {type === 'file' ? (
              row.fileName || row.fileId ? (
                <FileAttachmentPreview
                  presentation={presentation}
                  fileId={row.fileId}
                  fileName={row.fileName}
                  FilePreview={FilePreview}
                  FileButton={FileButton}
                  FileDownload={FileDownload}
                  formatMessage={formatMessage}
                  emptyContent={emptyContent}
                />
              ) : (
                emptyContent()
              )
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
);

const DeliverableBody = ({ item, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  if (item.templateCode === TEST_CASES_TEMPLATE) {
    const parsed = parseTestExecution(item);
    if (hasTestExecutionValue(parsed)) {
      const fileContent = (fileName, fileId, presentation) => (
        <FileAttachmentPreview
          presentation={presentation || PREVIEW_PRESENTATION.INLINE}
          fileId={fileId}
          fileName={fileName}
          FilePreview={FilePreview}
          FileButton={FileButton}
          FileDownload={FileDownload}
          formatMessage={formatMessage}
          emptyContent={emptyContent}
        />
      );
      return <TestStepsView parsed={parsed} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} fileContent={fileContent} formatMessage={formatMessage} emptyContent={emptyContent} />;
    }
  }
  if (item.templateCode === REGRESSION_TEMPLATE) {
    const parsed = parseRegressionRuns(item);
    if (hasRegressionValue(parsed)) {
      return (
        <RegressionTimelineView
          timeline={buildRegressionTimeline(parsed.runs)}
          steps={flattenSteps(parseTestExecution({}))}
          FilePreview={FilePreview}
          FileButton={FileButton}
          FileDownload={FileDownload}
          formatMessage={formatMessage}
          emptyContent={emptyContent}
        />
      );
    }
  }
  if (item.contentType === 'text' && item.content) {
    return <MarkdownWithAttachments text={item.content} presentation={PREVIEW_PRESENTATION.MODAL} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
  }
  if (item.contentType === 'file' && (item.fileId || item.fileName)) {
    return (
      <FileAttachmentPreview
        presentation={resolveFilePreviewPresentation({ templateCode: item.templateCode, entryKind: 'deliverable_main' })}
        fileId={item.fileId}
        fileName={item.fileName}
        FilePreview={FilePreview}
        FileButton={FileButton}
        FileDownload={FileDownload}
        formatMessage={formatMessage}
        emptyContent={emptyContent}
      />
    );
  }
  if (item.contentType === 'url' && item.url) {
    return <UrlValue url={item.url} templateCode={item.templateCode} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
  }
  if (item.contentType === 'checklist' && item.checklist.length) {
    return <ChecklistBlock rows={item.checklist} formatMessage={formatMessage} />;
  }
  if (item.options && item.options.length) {
    return <OptionsBlock rows={item.options} templateCode={item.templateCode} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
  }
  if (!hasDeliverableBody(item)) {
    return <div className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.deliverableEmpty' })}</div>;
  }
  return null;
};

const OutputsSection = ({ outputs, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => (
  <div className={styles.contextSectionBody}>
    {outputs.summary ? (
      <div className={styles.contextProse}>
        <MarkdownWithAttachments text={outputs.summary} presentation={PREVIEW_PRESENTATION.MODAL} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
      </div>
    ) : null}
    {outputs.openQuestions.length ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.openQuestions' })}</h4>
        <ol className={styles.contextQuestionList}>
          {outputs.openQuestions.map((item, index) => (
            <li key={index}>{typeof item === 'string' ? item : stableStringify(item)}</li>
          ))}
        </ol>
      </div>
    ) : null}
    {outputs.draft.length ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.draftItems' })}</h4>
        <ul className={styles.contextChipList}>
          {outputs.draft.map((item, index) => {
            const code = item && item.templateCode ? String(item.templateCode) : '';
            const name = code ? textOrCode(formatMessage, templateNameId(code), code) : formatMessage({ id: 'adminFlow.ai.hasContent' });
            return (
              <li key={code || index}>
                <Tag bordered={false}>{name}</Tag>
                {item && item.hasContent ? <span className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.hasContent' })}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null}
    {outputs.decomposition ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.decomposition' })}</h4>
        <pre className={styles.contextCode}>{typeof outputs.decomposition === 'string' ? outputs.decomposition : stableStringify(outputs.decomposition)}</pre>
      </div>
    ) : null}
    {outputs.retryAfter ? (
      <div className={styles.contextFieldRow}>
        <span className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.retryAfter' })}</span>
        <span>{typeof outputs.retryAfter === 'string' ? outputs.retryAfter : stableStringify(outputs.retryAfter)}</span>
      </div>
    ) : null}
    <OtherFields value={outputs.others} formatMessage={formatMessage} />
  </div>
);

const ExitProgress = ({ exit, formatMessage }) => {
  if (!exit) {
    return null;
  }
  const summary = exit.summary || {};
  return (
    <div>
      <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.exitProgress' })}</h4>
      <div className={styles.contextExitHead}>
        {exit.hasCanAdvance ? (
          <Tag bordered={false} color={exit.canAdvance ? 'success' : 'warning'}>
            {formatMessage({ id: exit.canAdvance ? 'adminFlow.ai.canAdvance' : 'adminFlow.ai.cannotAdvance' })}
          </Tag>
        ) : null}
        {summary.requiredTotal != null ? <span className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.exitRequired' }, { accepted: summary.acceptedCount ?? '-', total: summary.requiredTotal })}</span> : null}
      </div>
      {exit.missing.length ? (
        <div>
          <h5 className={styles.contextSubTitle}>{formatMessage({ id: 'adminFlow.ai.missingRequired' })}</h5>
          <ul className={styles.contextSimpleList}>
            {exit.missing.map((item, index) => (
              <li key={(item && item.templateCode) || index}>
                {(item && (item.name || item.templateCode)) || '-'}
                {item && item.status ? <Tag bordered={false}>{textOrCode(formatMessage, deliverableStatusMessageId(item.status), item.status)}</Tag> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {exit.blockingChildren.length ? (
        <div>
          <h5 className={styles.contextSubTitle}>{formatMessage({ id: 'adminFlow.ai.blockingChildren' })}</h5>
          <pre className={styles.contextCode}>{stableStringify(exit.blockingChildren)}</pre>
        </div>
      ) : null}
      {exit.waiting.length ? (
        <div>
          <h5 className={styles.contextSubTitle}>{formatMessage({ id: 'adminFlow.ai.waitingConverge' })}</h5>
          <pre className={styles.contextCode}>{stableStringify(exit.waiting)}</pre>
        </div>
      ) : null}
    </div>
  );
};

const SnapshotSection = ({ snapshot, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => (
  <div className={styles.contextSectionBody}>
    <dl className={styles.contextMeta}>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.stage' })}>{snapshot.stage ? textOrCode(formatMessage, stageMessageId(snapshot.stage), snapshot.stage) : ''}</MetaItem>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.goal' })}>{snapshot.goal ? textOrCode(formatMessage, queueGoalMessageId(snapshot.goal), snapshot.goal) : ''}</MetaItem>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.flowId' })}>{snapshot.flowId}</MetaItem>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.workItemKey' })}>{snapshot.workItemKey}</MetaItem>
    </dl>
    <ExitProgress exit={snapshot.exitProgress} formatMessage={formatMessage} />
    {snapshot.suggestedQueries.length ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.suggestedQueries' })}</h4>
        <ul className={styles.contextChipList}>
          {snapshot.suggestedQueries.map(item => (
            <li key={item}>
              <code className={styles.contextQuery}>{item}</code>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.templates.length ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.templates' })}</h4>
        <ul className={styles.contextTemplateList}>
          {snapshot.templates.map((item, index) => (
            <li key={item.code || index} className={styles.contextTemplateItem}>
              <span className={styles.contextTemplateName}>{item.name || (item.code ? textOrCode(formatMessage, templateNameId(item.code), item.code) : '-')}</span>
              {item.required === true ? <Tag bordered={false}>{formatMessage({ id: 'adminFlow.deliverable.required' })}</Tag> : null}
              {item.required === false ? <Tag bordered={false}>{formatMessage({ id: 'adminFlow.deliverable.optional' })}</Tag> : null}
              {item.contentType ? <span className={styles.contextMuted}>{textOrCode(formatMessage, contentTypeMessageId(item.contentType), item.contentType)}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.deliverables.length ? (
      <div>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.deliverablesAtStart' })}</h4>
        <ul className={styles.contextDeliverableList}>
          {snapshot.deliverables.map((item, index) => (
            <li key={item.id || item.templateCode || index} className={styles.contextDeliverable}>
              <div className={styles.contextDeliverableHead}>
                <span className={styles.contextDeliverableName}>{item.name || (item.templateCode ? textOrCode(formatMessage, templateNameId(item.templateCode), item.templateCode) : '-')}</span>
                {item.status ? (
                  <Tag bordered={false} color={DELIVERABLE_STATUS_COLOR[item.status] || 'default'}>
                    {textOrCode(formatMessage, deliverableStatusMessageId(item.status), item.status)}
                  </Tag>
                ) : null}
                {item.producedBy ? <span className={styles.contextMuted}>{textOrCode(formatMessage, producedByMessageId(item.producedBy), item.producedBy)}</span> : null}
              </div>
              <DeliverableBody item={item} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
              {item.sourceRefs && item.sourceRefs.length ? <EvidenceRefsList items={item.sourceRefs} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} /> : null}
              {item.reviewRemark ? <div className={styles.contextRemark}>{item.reviewRemark}</div> : null}
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    <OtherFields value={snapshot.others} formatMessage={formatMessage} />
  </div>
);

const EventsSection = ({ events, formatMessage }) => (
  <Timeline
    className={styles.contextTimeline}
    items={events.map((item, index) => {
      const time =
        item.occurred && item.occurred.ok && !item.occurred.missing
          ? formatShanghaiTime(item.at).text
          : item.occurred && item.occurred.missing
            ? formatMessage({ id: 'adminFlow.ai.timeUnknown' })
            : formatMessage({ id: 'adminFlow.ai.timeInvalid' });
      return {
        color: eventTone(item.result),
        children: (
          <div key={item.index || index} className={styles.contextEvent}>
            <div className={styles.contextEventTime}>{time}</div>
            <div className={styles.contextEventHead}>
              <span className={styles.contextEventTool}>{item.tool || '-'}</span>
              {item.action ? <span className={styles.contextMuted}>{item.action}</span> : null}
              {item.result ? <Tag bordered={false}>{item.result}</Tag> : null}
            </div>
            {item.target ? (
              <div className={styles.contextEventTarget}>
                {formatMessage({ id: 'adminFlow.ai.eventTarget' })}
                {': '}
                {item.target}
              </div>
            ) : null}
            {isPresent(item.extra) ? (
              <details className={styles.contextEventExtra}>
                <summary>{formatMessage({ id: 'adminFlow.ai.eventExtra' })}</summary>
                <pre className={styles.contextCode}>{stableStringify(item.extra)}</pre>
              </details>
            ) : null}
          </div>
        )
      };
    })}
  />
);

const RawSection = ({ rawText, messageApi, formatMessage }) => (
  <div className={styles.contextSectionBody}>
    {rawText.contextSnapshot ? (
      <div className={styles.contextRawBlock}>
        <div className={styles.contextRawHead}>
          <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.rawContext' })}</h4>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(rawText.contextSnapshot, messageApi, formatMessage)} className={styles.contextCopy}>
            {formatMessage({ id: 'adminFlow.ai.copyContext' })}
          </Button>
        </div>
        <pre className={styles.contextJson}>{rawText.contextSnapshot}</pre>
      </div>
    ) : null}
    {rawText.outputs ? (
      <div className={styles.contextRawBlock}>
        <div className={styles.contextRawHead}>
          <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.rawOutputs' })}</h4>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(rawText.outputs, messageApi, formatMessage)} className={styles.contextCopy}>
            {formatMessage({ id: 'adminFlow.ai.copyOutputs' })}
          </Button>
        </div>
        <pre className={styles.contextJson}>{rawText.outputs}</pre>
      </div>
    ) : null}
  </div>
);

const SECTION_TITLE = {
  outputs: 'adminFlow.ai.outputs',
  snapshot: 'adminFlow.ai.contextSnapshot',
  events: 'adminFlow.ai.events',
  dispatch: 'adminFlow.ai.sectionDispatch',
  raw: 'adminFlow.ai.sectionRaw'
};

export const AiRunContextView = ({ data, FilePreview, FileButton, FileDownload, formatMessage }) => {
  const { message } = App.useApp();
  const parsed = useMemo(() => parseAiRunContext(data), [data]);
  const [openKeys, setOpenKeys] = useState(() => defaultOpenSections(parsed.sections));

  useEffect(() => {
    setOpenKeys(defaultOpenSections(parsed.sections));
  }, [parsed]);

  const emptyContent = () => <div className={styles.contentEmpty}>{formatMessage({ id: 'adminFlow.deliverable.contentEmpty' })}</div>;

  if (parsed.empty) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminFlow.ai.noDetail' })} />;
  }

  const statusLabel = parsed.status ? textOrCode(formatMessage, runStatusMessageId(parsed.status), parsed.status) : '';
  const stageLabel = parsed.stage ? textOrCode(formatMessage, stageMessageId(parsed.stage), parsed.stage) : '';
  const goalLabel = parsed.goal ? textOrCode(formatMessage, queueGoalMessageId(parsed.goal), parsed.goal) : '';

  const navSections = parsed.sections.filter(item => item !== 'summary');

  const goTo = key => {
    setOpenKeys(current => (current.includes(key) ? current : current.concat(key)));
    requestAnimationFrame(() => {
      const node = document.getElementById(`ai-run-context-${key}`);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const collapseItems = navSections.map(key => {
    let children = null;
    if (key === 'outputs') {
      children = <OutputsSection outputs={parsed.outputs} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
    } else if (key === 'snapshot') {
      children = <SnapshotSection snapshot={parsed.snapshot} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
    } else if (key === 'events') {
      children = <EventsSection events={parsed.events} formatMessage={formatMessage} />;
    } else if (key === 'dispatch') {
      children = (
        <ul className={styles.contextSimpleList}>
          {parsed.priorityReasons.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    } else if (key === 'raw') {
      children = <RawSection rawText={parsed.rawText} messageApi={message} formatMessage={formatMessage} />;
    }
    return {
      key,
      label: formatMessage({ id: SECTION_TITLE[key] || 'adminFlow.ai.emptySection' }),
      children: (
        <div id={`ai-run-context-${key}`} className={styles.contextAnchor}>
          {children}
        </div>
      )
    };
  });

  return (
    <div className={styles.contextModal}>
      <div className={styles.contextSummary}>
        <h3 className={styles.contextSummaryTitle}>{formatMessage({ id: 'adminFlow.ai.sectionSummary' })}</h3>
        <dl className={styles.contextMeta}>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.status' })}>
            {parsed.status ? (
              <Tag bordered={false} color={runStatusTone(parsed.status)}>
                {statusLabel}
              </Tag>
            ) : null}
          </MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.stage' })}>{stageLabel}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.goal' })}>{goalLabel}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.model' })}>{parsed.model}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.client' })}>{parsed.clientName}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.startedAt' })}>{formatTimeLabel(parsed.startedTime, formatMessage)}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.finishedAt' })}>{formatTimeLabel(parsed.finishedTime, formatMessage)}</MetaItem>
          <MetaItem label={formatMessage({ id: 'adminFlow.ai.runId' })}>
            {parsed.runId ? (
              <Typography.Text className={styles.contextCodeInline} copyable={{ text: parsed.runId }}>
                {parsed.runId}
              </Typography.Text>
            ) : null}
          </MetaItem>
        </dl>
        {parsed.error ? (
          <div className={styles.contextError} role="alert">
            <div className={styles.contextErrorLabel}>{formatMessage({ id: 'adminFlow.ai.error' })}</div>
            <pre className={styles.contextErrorBody}>{parsed.error}</pre>
          </div>
        ) : null}
      </div>
      {navSections.length ? (
        <nav className={styles.contextNav} aria-label={formatMessage({ id: 'adminFlow.ai.navAria' })}>
          {navSections.map(key => (
            <button type="button" key={key} className={styles.contextNavItem} onClick={() => goTo(key)}>
              {formatMessage({ id: SECTION_TITLE[key] || 'adminFlow.ai.emptySection' })}
            </button>
          ))}
        </nav>
      ) : null}
      {collapseItems.length ? <Collapse ghost activeKey={openKeys} onChange={keys => setOpenKeys(Array.isArray(keys) ? keys : [keys])} items={collapseItems} className={styles.contextCollapse} /> : null}
    </div>
  );
};

export const RemoteAiRunContextView = createWithRemoteLoader({
  modules: ['components-core:FilePreview', 'components-core:File@FileButton', 'components-core:File@Download']
})(({ remoteModules, ...props }) => {
  const [FilePreview, FileButton, FileDownload] = remoteModules;
  return <AiRunContextView FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} {...props} />;
});

export const ContextLoading = () => (
  <div className={styles.contextState}>
    <Spin />
  </div>
);

export const ContextLoadError = ({ formatMessage }) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminFlow.ai.loadError' })} />;

export default AiRunContextView;
