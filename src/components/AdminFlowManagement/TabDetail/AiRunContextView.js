import { useMemo } from 'react';
import { Descriptions, Empty, Spin, Timeline, Typography } from 'antd';
import { CheckCircleFilled, LinkOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { contentTypeMessageId, DELIVERABLE_STATUS_COLOR, producedByMessageId, templateNameId } from '../constants';
import { TEST_CASES_TEMPLATE, REGRESSION_TEMPLATE, buildRegressionTimeline, flattenSteps, formatShanghaiTime, hasRegressionValue, hasTestExecutionValue, parseRegressionRuns, parseTestExecution } from '../testExecution';
import { isInPageUrlPreviewTemplate, PREVIEW_PRESENTATION, resolveFilePreviewPresentation } from '../deliverablePreview';
import { eventTone, hasDeliverableBody, isPresent, parseAiRunContext, resolveDeliverableStatus, resolveGoal, resolveRunStatus, resolveStage } from '../aiRunContext';
import KneDocumentJsonView from '../../Shared/KneDocumentJsonView';
import { FlowCardHeader, FlowCardMeta } from '../FlowCardHeader';
import { EvidenceRefsList, FileAttachmentPreview, MarkdownWithAttachments } from './FileAttachmentPreview';
import { DecompositionPlanView, DecompositionOutputView } from './DecompositionPlanView';
import { isDecompositionTemplate, parseDecompositionDeliverable, parseDecompositionOutput } from '../decompositionPlan';
import { RegressionTimelineView, TestStepsView } from './TestExecutionViews';
import { selectValueOf } from '../selectValue';
import styles from '../style.module.scss';

const enumLabel = (formatMessage, meta) => {
  if (!meta || meta.empty) return '';
  return formatMessage({ id: meta.messageId, values: meta.values || {} });
};

const namedLabel = (formatMessage, id, code) => {
  if (!code) return '';
  return formatMessage({ id, defaultMessage: code });
};

const JsonBlock = ({ data }) => {
  if (data === undefined) return null;
  return (
    <div className={styles.contextJsonView}>
      <KneDocumentJsonView data={data} theme="light" searchable collapsable />
    </div>
  );
};

const renderValue = value => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return <JsonBlock data={value} />;
};

const formatTimeLabel = (formatted, formatMessage) => {
  if (formatted && formatted.ok) {
    return formatted.text;
  }
  if (formatted && formatted.missing) {
    return formatMessage({ id: 'adminFlow.ai.timeUnknown' });
  }
  return formatMessage({ id: 'adminFlow.ai.timeInvalid' });
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
            <dd>{renderValue(value[key])}</dd>
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
            <span className={styles.materialType}>{namedLabel(formatMessage, `adminFlow.deliverable.material.${type}`, type)}</span>
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
  if (isDecompositionTemplate(item.templateCode)) {
    const parsed = parseDecompositionDeliverable(item);
    if (parsed.kind === 'empty') return <div className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.deliverableEmpty' })}</div>;
    if (parsed.kind === 'tasks') {
      return <DecompositionPlanView parsed={parsed} templateCode={item.templateCode} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />;
    }
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
            <li key={index}>{typeof item === 'string' ? item : renderValue(item)}</li>
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
            const name = code ? namedLabel(formatMessage, templateNameId(code), code) : formatMessage({ id: 'adminFlow.ai.hasContent' });
            return (
              <li key={code || index}>
                <span className={styles.contextQuery}>{name}</span>
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
        <DecompositionOutputView value={outputs.decomposition} formatMessage={formatMessage} unknownFallback={data => <JsonBlock data={data} />} />
      </div>
    ) : null}
    {outputs.retryAfter ? (
      <div className={styles.contextFieldRow}>
        <span className={styles.contextMuted}>{formatMessage({ id: 'adminFlow.ai.retryAfter' })}</span>
        <span>{typeof outputs.retryAfter === 'string' ? outputs.retryAfter : renderValue(outputs.retryAfter)}</span>
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
          <span className={styles.contextInlineStatus} data-tone={exit.canAdvance ? 'success' : 'warning'}>
            {formatMessage({ id: exit.canAdvance ? 'adminFlow.ai.canAdvance' : 'adminFlow.ai.cannotAdvance' })}
          </span>
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
                {item && item.status ? (
                  <span className={styles.contextInlineStatus} data-tone={DELIVERABLE_STATUS_COLOR[item.status] || 'default'}>
                    {enumLabel(formatMessage, resolveDeliverableStatus(item.status))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {exit.blockingChildren.length ? (
        <div>
          <h5 className={styles.contextSubTitle}>{formatMessage({ id: 'adminFlow.ai.blockingChildren' })}</h5>
          <JsonBlock data={exit.blockingChildren} />
        </div>
      ) : null}
      {exit.waiting.length ? (
        <div>
          <h5 className={styles.contextSubTitle}>{formatMessage({ id: 'adminFlow.ai.waitingConverge' })}</h5>
          <JsonBlock data={exit.waiting} />
        </div>
      ) : null}
    </div>
  );
};

const SnapshotSection = ({ snapshot, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => (
  <div className={styles.contextSectionBody}>
    <dl className={styles.contextMeta}>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.stage' })}>{snapshot.stage ? enumLabel(formatMessage, resolveStage(snapshot.stage)) : ''}</MetaItem>
      <MetaItem label={formatMessage({ id: 'adminFlow.ai.goal' })}>{snapshot.goal ? enumLabel(formatMessage, resolveGoal(snapshot.goal)) : ''}</MetaItem>
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
              <FlowCardHeader
                title={item.name || (item.code ? namedLabel(formatMessage, templateNameId(item.code), item.code) : '-')}
                meta={
                  <FlowCardMeta
                    items={[
                      item.required === true
                        ? { key: 'required', tone: 'warning', children: formatMessage({ id: 'adminFlow.deliverable.required' }) }
                        : item.required === false
                          ? { key: 'optional', children: formatMessage({ id: 'adminFlow.deliverable.optional' }) }
                          : null,
                      item.contentType ? { key: 'type', children: namedLabel(formatMessage, contentTypeMessageId(item.contentType), item.contentType) } : null
                    ]}
                  />
                }
              />
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
              <FlowCardHeader
                title={item.name || (item.templateCode ? namedLabel(formatMessage, templateNameId(item.templateCode), item.templateCode) : '-')}
                meta={
                  <FlowCardMeta
                    items={[
                      item.status ? { key: 'status', tone: DELIVERABLE_STATUS_COLOR[item.status] || 'default', children: enumLabel(formatMessage, resolveDeliverableStatus(item.status)) } : null,
                      item.producedBy ? { key: 'produced', children: namedLabel(formatMessage, producedByMessageId(item.producedBy), item.producedBy) } : null
                    ]}
                  />
                }
              />
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
              {item.result ? (
                <span className={styles.contextInlineStatus} data-tone={eventTone(item.result)}>
                  {item.result}
                </span>
              ) : null}
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
                <JsonBlock data={item.extra} />
              </details>
            ) : null}
          </div>
        )
      };
    })}
  />
);

const RawSection = ({ raw, formatMessage }) => (
  <div className={styles.contextSectionBody}>
    {raw.contextSnapshot !== undefined ? (
      <div className={styles.contextRawBlock}>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.rawContext' })}</h4>
        <JsonBlock data={raw.contextSnapshot} />
      </div>
    ) : null}
    {raw.outputs !== undefined ? (
      <div className={styles.contextRawBlock}>
        <h4 className={styles.contextBlockTitle}>{formatMessage({ id: 'adminFlow.ai.rawOutputs' })}</h4>
        <JsonBlock data={raw.outputs} />
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
  const parsed = useMemo(() => parseAiRunContext(data), [data]);
  const emptyContent = () => <div className={styles.contentEmpty}>{formatMessage({ id: 'adminFlow.deliverable.contentEmpty' })}</div>;

  if (parsed.empty) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'adminFlow.ai.noDetail' })} />;
  }

  const statusMeta = parsed.statusMeta || resolveRunStatus(parsed.status);
  const stageMeta = parsed.stageMeta || resolveStage(parsed.stage);
  const goalMeta = parsed.goalMeta || resolveGoal(parsed.goal);
  const statusLabel = enumLabel(formatMessage, statusMeta);
  const stageLabel = enumLabel(formatMessage, stageMeta);
  const goalLabel = enumLabel(formatMessage, goalMeta);

  const identity = [statusLabel ? { key: 'status', tone: statusMeta.tone || 'default', label: statusLabel } : null, stageLabel ? { key: 'stage', label: stageLabel } : null, goalLabel ? { key: 'goal', label: goalLabel } : null].filter(
    Boolean
  );

  const facts = [
    parsed.model ? { key: 'model', label: formatMessage({ id: 'adminFlow.ai.model' }), children: parsed.model } : null,
    parsed.clientName ? { key: 'client', label: formatMessage({ id: 'adminFlow.ai.client' }), children: parsed.clientName } : null,
    parsed.startedTime ? { key: 'started', label: formatMessage({ id: 'adminFlow.ai.startedAt' }), children: formatTimeLabel(parsed.startedTime, formatMessage) } : null,
    parsed.finishedTime ? { key: 'finished', label: formatMessage({ id: 'adminFlow.ai.finishedAt' }), children: formatTimeLabel(parsed.finishedTime, formatMessage) } : null,
    parsed.runId
      ? {
          key: 'runId',
          label: formatMessage({ id: 'adminFlow.ai.runId' }),
          children: (
            <Typography.Text className={styles.contextCodeInline} copyable={{ text: parsed.runId }}>
              {parsed.runId}
            </Typography.Text>
          )
        }
      : null
  ].filter(Boolean);

  const sections = [];
  if (parsed.sections.includes('outputs')) {
    sections.push({
      key: 'outputs',
      titleId: SECTION_TITLE.outputs,
      children: <OutputsSection outputs={parsed.outputs} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
    });
  }
  if (parsed.sections.includes('snapshot')) {
    sections.push({
      key: 'snapshot',
      titleId: SECTION_TITLE.snapshot,
      children: <SnapshotSection snapshot={parsed.snapshot} FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} formatMessage={formatMessage} emptyContent={emptyContent} />
    });
  }
  if (parsed.sections.includes('events')) {
    sections.push({
      key: 'events',
      titleId: SECTION_TITLE.events,
      children: <EventsSection events={parsed.events} formatMessage={formatMessage} />
    });
  }
  if (parsed.sections.includes('dispatch')) {
    sections.push({
      key: 'dispatch',
      titleId: SECTION_TITLE.dispatch,
      children: (
        <ul className={styles.contextSimpleList}>
          {parsed.priorityReasons.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    });
  }

  return (
    <div className={styles.contextModal}>
      <header className={styles.contextLead}>
        {identity.length ? (
          <p className={styles.contextIdentity}>
            {identity.map(item => (
              <span key={item.key} data-tone={item.tone || undefined}>
                {item.label}
              </span>
            ))}
          </p>
        ) : null}
        {facts.length ? (
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} colon className={styles.contextFacts}>
            {facts.map(item => (
              <Descriptions.Item key={item.key} label={item.label}>
                {item.children}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
        {parsed.error ? (
          <div className={styles.contextError} role="alert">
            <div className={styles.contextErrorLabel}>{formatMessage({ id: 'adminFlow.ai.error' })}</div>
            <pre className={styles.contextErrorBody}>{parsed.error}</pre>
          </div>
        ) : null}
      </header>
      {sections.map(section => (
        <section key={section.key} className={styles.contextSection} aria-labelledby={`ai-run-context-${section.key}-title`}>
          <h3 id={`ai-run-context-${section.key}-title`} className={styles.contextSectionTitle}>
            {formatMessage({ id: section.titleId })}
          </h3>
          <div className={styles.contextSectionBody}>{section.children}</div>
        </section>
      ))}
      {parsed.sections.includes('raw') ? (
        <details className={styles.contextRawDetails}>
          <summary className={styles.contextRawSummary}>{formatMessage({ id: 'adminFlow.ai.sectionRaw' })}</summary>
          <div className={styles.contextSectionBody}>
            <RawSection raw={parsed.raw} formatMessage={formatMessage} />
          </div>
        </details>
      ) : null}
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
