import { ArticleBlock, AsideMetaList, AsidePanel, CautionList, KeypointList, RecordDetailLayout, RecordList, StoryChapter, StoryPanel, SubSection } from './NarrativeLayout';
import { codeBlock, formatDateTime, hasValue, link, tagList } from './renderHelpers';
import SourceWorklogList from './SourceWorklogList';
import styles from './style.module.scss';

const ExperienceDetail = ({ data, formatMessage, worklogBaseUrl }) => {
  const content = data.content || {};
  const keywords = data.keywords || content.keywords || [];
  const keyCode = Array.isArray(content.keyCode) ? content.keyCode : [];
  const artifacts = Array.isArray(content.artifacts) ? content.artifacts : [];
  const sourceWorklogs = Array.isArray(content.sourceWorklogs) ? content.sourceWorklogs : [];

  const hasPractice = hasValue(content.symptoms) || hasValue(content.donts) || keywords.length > 0;
  const hasRecordDates = hasValue(content.writtenAt || data.writtenAt) || hasValue(content.updatedAt || data.updatedAt);
  const hasAside = hasValue(content.project) || hasRecordDates || artifacts.length > 0 || sourceWorklogs.length > 0;

  let step = 0;

  const main = (
    <StoryPanel>
      {hasValue(content.problem) ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.problem.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.problem.desc' })}>
          <ArticleBlock>{content.problem}</ArticleBlock>
        </StoryChapter>
      ) : null}

      {hasValue(content.solution) ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.solution.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.solution.desc' })}>
          <ArticleBlock>{content.solution}</ArticleBlock>
        </StoryChapter>
      ) : null}

      {hasValue(content.rootCause) ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.rootCause.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.rootCause.desc' })}>
          <ArticleBlock>{content.rootCause}</ArticleBlock>
        </StoryChapter>
      ) : null}

      {hasPractice ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.practice.title' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.practice.desc' })}>
          <SubSection label={formatMessage({ id: 'adminExperience.tabDetail.symptoms' })}>
            <KeypointList items={content.symptoms} />
          </SubSection>
          <SubSection label={formatMessage({ id: 'adminExperience.tabDetail.donts' })}>
            <CautionList items={content.donts} />
          </SubSection>
          <SubSection label={formatMessage({ id: 'adminExperience.tabDetail.keywords' })}>{tagList(keywords)}</SubSection>
        </StoryChapter>
      ) : null}

      {keyCode.length > 0 ? (
        <StoryChapter step={(step += 1)} title={formatMessage({ id: 'kneDocumentRecordDetail.keyCode' })} subtitle={formatMessage({ id: 'kneDocumentRecordDetail.narrative.implementation.desc' })}>
          <div className={styles['code-stack']}>{keyCode.map((item, index) => codeBlock(item.code, [item.path, item.symbol, item.language].filter(Boolean).join(' · ') || `#${index + 1}`, item.why))}</div>
        </StoryChapter>
      ) : null}
    </StoryPanel>
  );

  const aside = hasAside ? (
    <>
      {hasValue(content.project) || hasRecordDates ? (
        <AsidePanel title={formatMessage({ id: 'kneDocumentRecordDetail.narrative.context.title' })}>
          <AsideMetaList
            items={[
              { label: formatMessage({ id: 'kneDocumentRecordDetail.writtenAt' }), value: formatDateTime(content.writtenAt || data.writtenAt) },
              { label: formatMessage({ id: 'common.updatedAt' }), value: formatDateTime(content.updatedAt || data.updatedAt) },
              { label: formatMessage({ id: 'kneDocumentRecordDetail.projectName' }), value: content.project?.name },
              { label: formatMessage({ id: 'kneDocumentRecordDetail.defaultBranch' }), value: content.project?.defaultBranch },
              {
                label: formatMessage({ id: 'kneDocumentRecordDetail.projectUrl' }),
                value: content.project?.githubUrl ? link(content.project.githubUrl) : null
              }
            ]}
          />
        </AsidePanel>
      ) : null}
      {artifacts.length > 0 ? (
        <AsidePanel title={formatMessage({ id: 'kneDocumentRecordDetail.artifacts' })}>
          <RecordList
            items={artifacts.map((item, index) => ({
              title: item.name || `#${index + 1}`,
              meta: [item.type, item.package, item.token].filter(Boolean).join(' · ')
            }))}
          />
        </AsidePanel>
      ) : null}
      {sourceWorklogs.length > 0 ? <SourceWorklogList items={sourceWorklogs} worklogBaseUrl={worklogBaseUrl} formatMessage={formatMessage} /> : null}
    </>
  ) : null;

  return <RecordDetailLayout main={main} aside={aside} />;
};

export default ExperienceDetail;
