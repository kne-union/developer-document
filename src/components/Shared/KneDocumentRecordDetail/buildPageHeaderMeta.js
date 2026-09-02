import { Tag } from 'antd';
import { formatDateTime } from './renderHelpers';

const categoryLabelMap = formatMessage => ({
  business: formatMessage({ id: 'adminExperience.category.business' }),
  library: formatMessage({ id: 'adminExperience.category.library' }),
  process: formatMessage({ id: 'adminExperience.category.process' })
});

export const buildKneDocumentPageHeaderMeta = ({ recordType, data, formatMessage }) => {
  const content = data.content || {};
  const tags = [];

  if (recordType === 'experience') {
    tags.push(
      data.status === 'active' ? (
        <Tag key="status" color="success">
          {formatMessage({ id: 'adminExperience.status.active' })}
        </Tag>
      ) : (
        <Tag key="status">{formatMessage({ id: 'adminExperience.status.closed' })}</Tag>
      )
    );

    const category = data.category || content.category;
    if (category) {
      tags.push(
        <Tag key="category" color="processing">
          {categoryLabelMap(formatMessage)[category] || category}
        </Tag>
      );
    }

    if (content.schemaVersion != null) {
      tags.push(<Tag key="schema">v{content.schemaVersion}</Tag>);
    }
  } else {
    const projectName = data.projectName || content.project?.name;
    if (projectName) {
      tags.push(
        <Tag key="project" color="blue">
          {projectName}
        </Tag>
      );
    }

    if (content.schemaVersion != null) {
      tags.push(<Tag key="schema">v{content.schemaVersion}</Tag>);
    }

    const score = content.score?.overall;
    if (score != null) {
      tags.push(
        <Tag key="score" color="gold">
          {formatMessage({ id: 'adminWorklog.tabDetail.score' })} {score}/{content.score?.scale?.max || 10}
        </Tag>
      );
    }
  }

  return {
    title: data.title || data.relativePath || '-',
    meta: {
      id: data.id,
      relativePath: data.relativePath,
      creator: data.createdUser?.nickname || data.createdUser?.email,
      createdAt: formatDateTime(data.createdAt),
      writtenAt: formatDateTime(data.writtenAt || content.writtenAt),
      updatedAt: formatDateTime(data.updatedAt || content.updatedAt)
    },
    tags
  };
};
