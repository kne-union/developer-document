import { Tag, Timeline } from 'antd';
import { flattenSteps, formatShanghaiTime, hasRegressionValue, hasTestExecutionValue, lookupStep } from '../testExecution';
import { PREVIEW_PRESENTATION, resolveFilePreviewPresentation } from '../deliverablePreview';
import { FileAttachmentPreview, MarkdownWithAttachments } from './FileAttachmentPreview';
import styles from '../style.module.scss';

const STEP_RESULT_IDS = {
  passed: 'adminFlow.testStep.result.passed',
  failed: 'adminFlow.testStep.result.failed',
  blocked: 'adminFlow.testStep.result.blocked',
  skipped: 'adminFlow.testStep.result.skipped'
};

const REGRESSION_STATUS_IDS = {
  passed: 'adminFlow.regression.status.passed',
  failed: 'adminFlow.regression.status.failed',
  partial: 'adminFlow.regression.status.partial',
  blocked: 'adminFlow.regression.status.blocked'
};

const RESULT_TAG_COLOR = { passed: 'success', failed: 'error', blocked: 'warning', skipped: 'default', partial: 'warning' };
const TIMELINE_COLOR = { passed: 'green', failed: 'red', blocked: 'orange', partial: 'orange', skipped: 'gray', '': 'gray' };

export const stepResultOptions = formatMessage => [
  { label: formatMessage({ id: STEP_RESULT_IDS.passed }), value: 'passed' },
  { label: formatMessage({ id: STEP_RESULT_IDS.failed }), value: 'failed' },
  { label: formatMessage({ id: STEP_RESULT_IDS.blocked }), value: 'blocked' },
  { label: formatMessage({ id: STEP_RESULT_IDS.skipped }), value: 'skipped' }
];

export const regressionStatusOptions = formatMessage => [
  { label: formatMessage({ id: REGRESSION_STATUS_IDS.passed }), value: 'passed' },
  { label: formatMessage({ id: REGRESSION_STATUS_IDS.failed }), value: 'failed' },
  { label: formatMessage({ id: REGRESSION_STATUS_IDS.partial }), value: 'partial' },
  { label: formatMessage({ id: REGRESSION_STATUS_IDS.blocked }), value: 'blocked' }
];

export const ScreenshotGallery = ({ shots, FilePreview, FileButton, FileDownload, emptyText, presentation, formatMessage }) => {
  if (!shots || !shots.length) {
    return emptyText ? <div className={styles.shotEmpty}>{emptyText}</div> : null;
  }
  // 非核心（如回归记录自身截图）：文件名点击同页弹窗，页面上不铺大预览。
  if (presentation === PREVIEW_PRESENTATION.MODAL) {
    return (
      <div className={styles.modalPreviewList}>
        {shots.map(shot => (
          <FileAttachmentPreview
            key={shot.fileId}
            presentation={PREVIEW_PRESENTATION.MODAL}
            fileId={shot.fileId}
            fileName={shot.fileName}
            FilePreview={FilePreview}
            FileButton={FileButton}
            FileDownload={FileDownload}
            formatMessage={formatMessage}
          />
        ))}
      </div>
    );
  }
  // 核心测试步骤截图：缩略图直接可见，点击在同页弹窗放大，下载是弹窗内的次操作。
  return (
    <div className={styles.shotGrid}>
      {shots.map(shot => (
        <FileButton key={shot.fileId} id={shot.fileId} filename={shot.fileName} type="link" className={styles.shotThumbBtn} openDownload>
          <span className={styles.shotThumb}>
            <span className={styles.shotThumbPreview}>
              <FilePreview id={shot.fileId} filename={shot.fileName} originName={shot.fileName} />
            </span>
            <span className={styles.shotName} title={shot.fileName}>
              {shot.fileName}
            </span>
          </span>
        </FileButton>
      ))}
    </div>
  );
};

export const TestStepsView = ({ parsed, FilePreview, FileButton, FileDownload, fileContent, formatMessage, emptyContent }) => {
  if (!hasTestExecutionValue(parsed)) {
    return emptyContent();
  }
  return (
    <div className={styles.testExecution}>
      {parsed.documents && parsed.documents.length ? (
        <section className={styles.testDocuments}>
          <h3 className={styles.testSectionTitle}>{formatMessage({ id: 'adminFlow.testStep.documents' })}</h3>
          {parsed.documents.map(doc => (
            <div key={doc.fileId} className={styles.testDocument}>
              {fileContent(doc.fileName, doc.fileId, resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_case_document' }))}
            </div>
          ))}
        </section>
      ) : null}
      {(parsed.cases || []).map((testCase, caseIndex) => (
        <section key={testCase.caseId || `case-${caseIndex}`} className={styles.testCase}>
          <h3 className={styles.testSectionTitle}>{testCase.label || formatMessage({ id: 'adminFlow.testStep.caseIndex' }, { index: caseIndex + 1 })}</h3>
          {testCase.steps && testCase.steps.length ? (
            <ol className={styles.testSteps}>
              {testCase.steps.map((step, stepIndex) => (
                <li key={step.stepId || `step-${stepIndex}`} className={styles.testStep}>
                  <div className={styles.testStepHead}>
                    <span className={styles.testStepName}>{step.name || formatMessage({ id: 'adminFlow.deliverable.contentEmpty' })}</span>
                    {step.result ? (
                      <Tag className={styles.testStepResult} bordered={false} color={RESULT_TAG_COLOR[step.result] || 'default'}>
                        {formatMessage({ id: STEP_RESULT_IDS[step.result] || 'adminFlow.testStep.result.empty', defaultMessage: step.result })}
                      </Tag>
                    ) : (
                      <span className={styles.testStepResultMuted}>{formatMessage({ id: 'adminFlow.testStep.result.empty' })}</span>
                    )}
                  </div>
                  {step.remark ? <div className={styles.testStepRemark}>{step.remark}</div> : null}
                  <ScreenshotGallery
                    shots={step.screenshots}
                    FilePreview={FilePreview}
                    FileButton={FileButton}
                    FileDownload={FileDownload}
                    presentation={resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_step_screenshot' })}
                    formatMessage={formatMessage}
                    emptyText={formatMessage({ id: 'adminFlow.testStep.noShots' })}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.shotEmpty}>{formatMessage({ id: 'adminFlow.testStep.noSteps' })}</div>
          )}
        </section>
      ))}
      {parsed.unlinkedScreenshots && parsed.unlinkedScreenshots.length ? (
        <section className={styles.testUnlinked}>
          <h3 className={styles.testSectionTitle}>{formatMessage({ id: 'adminFlow.testStep.unlinked' })}</h3>
          <p className={styles.testUnlinkedHint}>{formatMessage({ id: 'adminFlow.testStep.unlinkedHint' })}</p>
          <ScreenshotGallery
            shots={parsed.unlinkedScreenshots}
            FilePreview={FilePreview}
            FileButton={FileButton}
            FileDownload={FileDownload}
            presentation={resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_unlinked_screenshot' })}
            formatMessage={formatMessage}
          />
        </section>
      ) : null}
    </div>
  );
};

export const RegressionTimelineView = ({ timeline, steps, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  if (!hasRegressionValue({ runs: timeline && timeline.items })) {
    return emptyContent();
  }
  return (
    <Timeline
      className={styles.regressionTimeline}
      items={(timeline.items || []).map((run, index) => {
        const time = formatShanghaiTime(run.occurredAt);
        let timeText = formatMessage({ id: 'adminFlow.regression.timeUnknown' });
        if (run.occurredInvalid) {
          timeText = formatMessage({ id: 'adminFlow.regression.timeInvalid' });
        } else if (time.ok) {
          timeText = time.text;
        }
        const related = (run.stepIds || []).map(stepId => ({ stepId, step: lookupStep(steps, stepId) }));
        return {
          color: TIMELINE_COLOR[run.status] || 'gray',
          children: (
            <div key={run.runId || `run-${index}`} className={styles.regressionItem}>
              <div className={styles.regressionTime}>{timeText}</div>
              <div className={styles.regressionMeta}>
                {run.status ? (
                  <Tag bordered={false} color={RESULT_TAG_COLOR[run.status] || 'default'}>
                    {formatMessage({ id: REGRESSION_STATUS_IDS[run.status] || 'adminFlow.regression.status.empty', defaultMessage: run.status })}
                  </Tag>
                ) : (
                  <span className={styles.testStepResultMuted}>{formatMessage({ id: 'adminFlow.regression.status.empty' })}</span>
                )}
                {run.operatorName ? (
                  <span className={styles.regressionOperator}>
                    {formatMessage({ id: 'adminFlow.regression.operator' })}
                    {run.operatorName}
                  </span>
                ) : null}
              </div>
              {run.plainText ? <p className={styles.regressionHint}>{formatMessage({ id: 'adminFlow.regression.plainTextHint' })}</p> : null}
              {run.content ? (
                <div className={styles.regressionNote}>
                  <MarkdownWithAttachments
                    text={run.content}
                    presentation={PREVIEW_PRESENTATION.MODAL}
                    FilePreview={FilePreview}
                    FileButton={FileButton}
                    FileDownload={FileDownload}
                    formatMessage={formatMessage}
                    emptyContent={emptyContent}
                  />
                </div>
              ) : null}
              {related.length ? (
                <div className={styles.regressionRelated}>
                  <div className={styles.regressionRelatedLabel}>{formatMessage({ id: 'adminFlow.regression.relatedSteps' })}</div>
                  <ul className={styles.regressionStepList}>
                    {related.map(item => (
                      <li key={item.stepId} className={styles.regressionStepItem}>
                        <div className={styles.regressionStepName}>
                          {item.step ? `${item.step.caseLabel ? `${item.step.caseLabel} · ` : ''}${item.step.name}` : `${formatMessage({ id: 'adminFlow.regression.unknownStep' })}（${item.stepId}）`}
                        </div>
                        {item.step && item.step.screenshots && item.step.screenshots.length ? (
                          <ScreenshotGallery
                            shots={item.step.screenshots}
                            FilePreview={FilePreview}
                            FileButton={FileButton}
                            FileDownload={FileDownload}
                            presentation={resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_step_screenshot' })}
                            formatMessage={formatMessage}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {run.screenshots && run.screenshots.length ? (
                <ScreenshotGallery
                  shots={run.screenshots}
                  FilePreview={FilePreview}
                  FileButton={FileButton}
                  FileDownload={FileDownload}
                  presentation={resolveFilePreviewPresentation({ templateCode: 'regression_note', entryKind: 'regression_screenshot' })}
                  formatMessage={formatMessage}
                />
              ) : null}
            </div>
          )
        };
      })}
    />
  );
};

const hiddenIdField = (Input, name) => <Input name={name} className={styles.hiddenId} label=" " />;

const fileRowFields = (Upload, Input, formatMessage) => [
  <Upload name="fileId" label={formatMessage({ id: 'adminFlow.deliverable.material.fileField' })} rule="REQ" interceptor={['object-output-value', 'array-single']} maxLength={1} multiple={false} />,
  <Input name="fileName" label={formatMessage({ id: 'adminFlow.deliverable.fileName' })} rule="REQ LEN-1-200" tips={formatMessage({ id: 'adminFlow.deliverable.fileNameTip' })} />
];

export const buildTestCasesFields = (FormInfo, formatMessage) => {
  const { Input, SuperSelect, Upload } = FormInfo.fields;
  const { List } = FormInfo;
  return [
    <List
      name="cases"
      title={formatMessage({ id: 'adminFlow.testStep.cases' })}
      addText={formatMessage({ id: 'adminFlow.testStep.addCase' })}
      itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.caseIndex' }, { index: index + 1 })}
      list={[
        hiddenIdField(Input, 'caseId'),
        <Input name="label" label={formatMessage({ id: 'adminFlow.testStep.caseName' })} rule="REQ LEN-1-200" block />,
        <List
          name="steps"
          title={formatMessage({ id: 'adminFlow.testStep.steps' })}
          addText={formatMessage({ id: 'adminFlow.testStep.addStep' })}
          itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.stepIndex' }, { index: index + 1 })}
          list={[
            hiddenIdField(Input, 'stepId'),
            <Input name="name" label={formatMessage({ id: 'adminFlow.testStep.stepName' })} rule="REQ LEN-1-200" block />,
            <Input name="order" label={formatMessage({ id: 'adminFlow.testStep.stepOrder' })} tips={formatMessage({ id: 'adminFlow.testStep.stepOrderTip' })} />,
            <SuperSelect name="result" label={formatMessage({ id: 'adminFlow.testStep.result' })} single interceptor="object-output-value" options={stepResultOptions(formatMessage)} allowDefaultEmpty />,
            <Input name="remark" label={formatMessage({ id: 'adminFlow.deliverable.material.remark' })} block />,
            <List
              name="screenshots"
              title={formatMessage({ id: 'adminFlow.testStep.shots' })}
              addText={formatMessage({ id: 'adminFlow.testStep.addShot' })}
              itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.shotIndex' }, { index: index + 1 })}
              list={fileRowFields(Upload, Input, formatMessage)}
            />
          ]}
        />
      ]}
    />,
    <List
      name="unlinkedScreenshots"
      title={formatMessage({ id: 'adminFlow.testStep.unlinkedTitle' })}
      addText={formatMessage({ id: 'adminFlow.testStep.addShot' })}
      itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.shotIndex' }, { index: index + 1 })}
      list={fileRowFields(Upload, Input, formatMessage)}
    />,
    <List
      name="documents"
      title={formatMessage({ id: 'adminFlow.testStep.documents' })}
      addText={formatMessage({ id: 'adminFlow.testStep.addDocument' })}
      itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.docIndex' }, { index: index + 1 })}
      list={fileRowFields(Upload, Input, formatMessage)}
    />
  ];
};

export const buildRegressionFields = (FormInfo, Editor, formatMessage, stepOptions) => {
  const { Input, SuperSelect, Upload, DatePicker, Select } = FormInfo.fields;
  const { List } = FormInfo;
  const timeField = DatePicker ? (
    <DatePicker name="occurredAt" label={formatMessage({ id: 'adminFlow.regression.occurredAt' })} tips={formatMessage({ id: 'adminFlow.regression.occurredAtTip' })} showTime format="YYYY-MM-DD HH:mm" />
  ) : (
    <Input name="occurredAt" label={formatMessage({ id: 'adminFlow.regression.occurredAt' })} tips={formatMessage({ id: 'adminFlow.regression.occurredAtTip' })} placeholder="2026-11-13 09:16" />
  );
  const stepField = Select ? (
    <Select name="stepIds" label={formatMessage({ id: 'adminFlow.regression.stepIds' })} mode="multiple" allowClear options={stepOptions || []} />
  ) : (
    <SuperSelect name="stepIds" label={formatMessage({ id: 'adminFlow.regression.stepIds' })} interceptor="object-output-value" options={stepOptions || []} allowDefaultEmpty />
  );
  return [
    <List
      name="runs"
      title={formatMessage({ id: 'adminFlow.regression.list' })}
      addText={formatMessage({ id: 'adminFlow.regression.add' })}
      itemTitle={({ index }) => formatMessage({ id: 'adminFlow.regression.runIndex' }, { index: index + 1 })}
      list={[
        hiddenIdField(Input, 'runId'),
        timeField,
        <SuperSelect name="status" label={formatMessage({ id: 'adminFlow.regression.status' })} single interceptor="object-output-value" options={regressionStatusOptions(formatMessage)} allowDefaultEmpty />,
        <Input name="operatorName" label={formatMessage({ id: 'adminFlow.regression.operatorLabel' })} />,
        Editor ? <Editor name="content" label={formatMessage({ id: 'adminFlow.regression.content' })} rows={6} block isMarkdown /> : <Input name="content" label={formatMessage({ id: 'adminFlow.regression.content' })} block />,
        stepField,
        <List
          name="screenshots"
          title={formatMessage({ id: 'adminFlow.regression.screenshots' })}
          addText={formatMessage({ id: 'adminFlow.testStep.addShot' })}
          itemTitle={({ index }) => formatMessage({ id: 'adminFlow.testStep.shotIndex' }, { index: index + 1 })}
          list={fileRowFields(Upload, Input, formatMessage)}
        />
      ]}
    />
  ];
};

export { flattenSteps };
