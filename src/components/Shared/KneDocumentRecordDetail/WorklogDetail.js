import { Tag } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { ArticleBlock, AsideMetaList, AsidePanel, KeypointList, RecordDetailLayout, StoryChapter, StoryPanel, SubSection } from './NarrativeLayout';
import { codeBlock, formatDateTime, hasValue, link, proposalFlowStatus, proposalStatusColor } from './renderHelpers';
import ScoreBoard from './ScoreBoard';
import styles from './style.module.scss';

const WorklogDetail = createWithRemoteLoader({
  modules: ['components-core:InfoPage@Flow']
})(({ remoteModules, data, formatMessage }) => {
  const [Flow] = remoteModules;
  const content = data.content || {};
  const requirement = content.requirement || {};
  const finalSolution = content.finalSolution || {};
  const score = content.score || {};
  const pr = content.pr || {};
  const proposals = Array.isArray(content.proposals) ? content.proposals : [];
  const snippets = Array.isArray(finalSolution.codeSnippets) ? finalSolution.codeSnippets : [];

  const hasRequirement = hasValue(requirement.summary) || hasValue(requirement.detail) || hasValue(requirement.acceptanceNotes);
  const hasSolution = hasValue(finalSolution.summary) || hasValue(finalSolution.versionBump) || hasValue(finalSolution.keyChanges);
  const hasScore = score.overall != null || hasValue(score.rationale) || hasValue(score.dimensions) || hasValue(score.userFeedbackSignals);
  const hasDelivery =
    hasValue(pr.url) ||
    hasValue(pr.number) ||
    hasValue(pr.branch) ||
    hasValue(pr.title) ||
    hasValue(content.project) ||
    hasValue(data.projectName) ||
    hasValue(data.writtenAt || content.writtenAt) ||
    hasValue(data.updatedAt || content.updatedAt);

  let step = 0;

  const main = (
    <StoryPanel>
      {hasValue(content.description) ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.overview.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.overview.desc' })}>
          <ArticleBlock>{content.description}</ArticleBlock>
        </StoryChapter>
      ) : null}

      {hasRequirement ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.requirement.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.requirement.desc' })}>
          <SubSection label={formatMessage({ id: 'adminWorklog.tabDetail.requirementSummary' })}>
            <ArticleBlock>{requirement.summary}</ArticleBlock>
          </SubSection>
          <SubSection label={formatMessage({ id: 'adminWorklog.tabDetail.requirementDetail' })}>
            <ArticleBlock>{requirement.detail}</ArticleBlock>
          </SubSection>
          <SubSection label={formatMessage({ id: 'kneDocumentRecordDetail.acceptanceNotes' })}>
            <ArticleBlock>{requirement.acceptanceNotes}</ArticleBlock>
          </SubSection>
        </StoryChapter>
      ) : null}

      {hasSolution ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.finalSolution.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.finalSolution.desc' })}>
          <ArticleBlock>{finalSolution.summary}</ArticleBlock>
          {hasValue(finalSolution.versionBump) ? (
            <div className={styles['version-row']}>
              <span className={styles['sub-label']}>{formatMessage({ id: 'kneDocumentRecordDetail.versionBump' })}</span>
              <Tag color="blue">{finalSolution.versionBump}</Tag>
            </div>
          ) : null}
          <SubSection label={formatMessage({ id: 'adminWorklog.tabDetail.keyChanges' })}>
            <KeypointList items={finalSolution.keyChanges} />
          </SubSection>
        </StoryChapter>
      ) : null}

      {proposals.length > 0 ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.evolution.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.evolution.desc' })}>
          <Flow
            dataSource={proposals.map((item, index) => ({
              title: (
                <span className={styles['flow-title']}>
                  {item.title || `#${item.id ?? index + 1}`}
                  {item.status ? <Tag color={proposalStatusColor(item.status)}>{item.status}</Tag> : null}
                </span>
              ),
              subTitle: formatDateTime(item.proposedAt),
              description: item.description,
              status: proposalFlowStatus(item.status)
            }))}
          />
        </StoryChapter>
      ) : null}

      {snippets.length > 0 ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.implementation.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.implementation.desc' })}>
          <div className={styles['code-stack']}>{snippets.map((snippet, index) => codeBlock(snippet.code, [snippet.path, snippet.language].filter(Boolean).join(' · ') || `#${index + 1}`))}</div>
        </StoryChapter>
      ) : null}

      {hasScore ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.evaluation.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.evaluation.desc' })}>
          <ScoreBoard score={score} formatMessage={formatMessage} />
          <SubSection label={formatMessage({ id: 'kneDocumentRecordDetail.userFeedbackSignals' })}>
            <KeypointList items={score.userFeedbackSignals} />
          </SubSection>
        </StoryChapter>
      ) : null}
    </StoryPanel>
  );

  const aside = hasDelivery ? (
    <AsidePanel title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.delivery.title' })}>
      <AsideMetaList
        items={[
          { label: formatMessage({ id: 'kneDocumentRecordDetail.writtenAt' }), value: formatDateTime(data.writtenAt || content.writtenAt) },
          { label: formatMessage({ id: 'common.updatedAt' }), value: formatDateTime(data.updatedAt || content.updatedAt) },
          { label: formatMessage({ id: 'kneDocumentRecordDetail.prNumber' }), value: pr.number },
          { label: formatMessage({ id: 'kneDocumentRecordDetail.prBranch' }), value: pr.branch },
          { label: formatMessage({ id: 'kneDocumentRecordDetail.prTitle' }), value: pr.title },
          { label: formatMessage({ id: 'kneDocumentRecordDetail.prUrl' }), value: pr.url ? link(pr.url) : null },
          {
            label: formatMessage({ id: 'kneDocumentRecordDetail.projectName' }),
            value: content.project?.name || data.projectName
          },
          { label: formatMessage({ id: 'kneDocumentRecordDetail.defaultBranch' }), value: content.project?.defaultBranch },
          {
            label: formatMessage({ id: 'kneDocumentRecordDetail.projectUrl' }),
            value: content.project?.githubUrl ? link(content.project.githubUrl) : null
          }
        ]}
      />
    </AsidePanel>
  ) : null;

  return <RecordDetailLayout main={main} aside={aside} />;
});

export default WorklogDetail;
