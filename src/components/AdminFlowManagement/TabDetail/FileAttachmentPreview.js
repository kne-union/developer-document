import { PaperClipOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createWithRemoteLoader } from '@kne/remote-loader';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import { classifyEvidencePreview, classifyPreviewSource, collectMarkdownFileAttachments, PREVIEW_PRESENTATION } from '../deliverablePreview';
import styles from '../style.module.scss';

/**
 * FileButton 弹窗由 components-core File 用 renderModal 接到 @kne/react-modal（bodyScroll 默认 true）。
 * SimpleBar 在无 padding 的 .modal-body 上；默认内边距在里边的 .modal-body-inner（24px）。
 * 远程 FileButton 的 .file-modal-outer 自带固定高度和 overflow:auto，滚动条落在 inner 的内边距里，轨道内缩、不贴边。
 * 官方 API noPadding（文档：预览卡片应贴齐内容区边缘）把 inner 内边距清零，轨道贴齐内容区边缘。
 * 不要把页内 previewStage 的 padding 加到弹窗滚动容器外层，也不要改全局 Modal。
 */
export const FILE_PREVIEW_MODAL_PROPS = { noPadding: true };

/**
 * 流程详情统一的文件预览呈现：核心走当前页 FilePreview，非核心走 FileButton 同页弹窗。
 * 下载始终是次操作；非法协议只展示无效提示，不生成可点击跳转。
 */
export const FileAttachmentPreview = ({ presentation, fileId, src, fileName, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  const source = classifyPreviewSource({ fileId, src, fileName });
  const mode = presentation === PREVIEW_PRESENTATION.INLINE ? PREVIEW_PRESENTATION.INLINE : PREVIEW_PRESENTATION.MODAL;

  if (source.kind === 'empty') {
    return typeof emptyContent === 'function' ? emptyContent() : emptyContent || null;
  }
  if (source.kind === 'invalid') {
    return (
      <div className={styles.previewUnsupported}>
        <p className={styles.previewUnsupportedTitle}>{formatMessage({ id: 'adminFlow.deliverable.previewInvalidUrl' })}</p>
      </div>
    );
  }
  if (source.kind === 'unsupported') {
    return (
      <div className={styles.previewUnsupported} data-preview-reason={source.reason}>
        <p className={styles.previewUnsupportedTitle}>{formatMessage({ id: 'adminFlow.deliverable.previewUnavailable' })}</p>
        <p className={styles.previewUnsupportedHint}>{formatMessage({ id: 'adminFlow.deliverable.previewManualHint' })}</p>
        {source.url ? (
          <Button type="link" href={source.url} target="_blank" rel="noopener noreferrer" className={styles.previewManualOpen}>
            {formatMessage({ id: 'adminFlow.deliverable.openManually' })}
          </Button>
        ) : null}
      </div>
    );
  }

  const id = source.kind === 'ossPreview' ? source.id : undefined;
  const url = source.kind === 'filePreview' ? source.src : undefined;
  const name = source.filename || fileName || (id ? String(id) : 'file');
  const ignoreContent = source.previewType === 'html';
  const download =
    FileDownload && (id || url) ? (
      <FileDownload id={id} src={url} filename={name} type="link" size="small" className={styles.previewDownload}>
        {formatMessage({ id: 'adminFlow.deliverable.download' })}
      </FileDownload>
    ) : null;

  if (mode === PREVIEW_PRESENTATION.MODAL && FileButton) {
    return (
      <div className={styles.modalPreviewEntry}>
        <FileButton id={id} src={url} filename={name} originName={name} type="link" className={styles.modalPreviewButton} openDownload ignoreContent={ignoreContent} title={formatMessage({ id: 'adminFlow.deliverable.previewInModal' })} modalProps={FILE_PREVIEW_MODAL_PROPS}>
          <span className={styles.modalPreviewLabel}>
            <PaperClipOutlined />
            {name}
          </span>
        </FileButton>
        {download}
      </div>
    );
  }

  return (
    <div className={styles.inPagePreview}>
      <div className={styles.previewToolbar}>
        <span className={styles.previewFileName} title={name}>
          <PaperClipOutlined />
          {name}
        </span>
        {download}
      </div>
      <div className={styles.previewStage}>
        <FilePreview id={id} src={url} filename={name} originName={name} ignoreContent={ignoreContent} />
      </div>
    </div>
  );
};

export const MarkdownWithAttachments = ({ text, presentation, FilePreview, FileButton, FileDownload, formatMessage, emptyContent }) => {
  const files = collectMarkdownFileAttachments(text);
  const mode = presentation === PREVIEW_PRESENTATION.INLINE ? PREVIEW_PRESENTATION.INLINE : PREVIEW_PRESENTATION.MODAL;
  return (
    <div className={styles.markdownBody}>
      <MarkdownRender>{text}</MarkdownRender>
      {files.length ? (
        <div className={styles.markdownFiles}>
          <div className={styles.markdownFilesTitle}>{formatMessage({ id: 'adminFlow.deliverable.markdownFiles' })}</div>
          {files.map((file, index) =>
            file.kind === 'invalid' ? (
              <div key={`md-invalid-${index}`} className={styles.previewUnsupported}>
                <p className={styles.previewUnsupportedTitle}>{formatMessage({ id: 'adminFlow.deliverable.previewInvalidUrl' })}</p>
              </div>
            ) : (
              <FileAttachmentPreview
                key={file.id || file.src || `md-file-${index}`}
                presentation={mode}
                fileId={file.id}
                src={file.src}
                fileName={file.filename}
                FilePreview={FilePreview}
                FileButton={FileButton}
                FileDownload={FileDownload}
                formatMessage={formatMessage}
                emptyContent={emptyContent}
              />
            )
          )}
        </div>
      ) : null}
    </div>
  );
};

const formatPlainRef = item => {
  if (item == null) {
    return '';
  }
  if (typeof item === 'string') {
    return item;
  }
  const type = item.type || 'ref';
  const ref = item.ref || item.url || item.id || '';
  return ref ? `${type}:${ref}` : type;
};

/** 台账证据：文件用弹窗预览，其它业务引用保持文本/普通链接，不强改预览。 */
export const EvidenceRefsList = ({ items, FilePreview, FileButton, FileDownload, formatMessage, emptyContent, emptyText }) => {
  if (!Array.isArray(items) || !items.length) {
    return emptyText || null;
  }
  return (
    <ul className={styles.evidenceList}>
      {items.map((item, index) => {
        const preview = classifyEvidencePreview(item);
        const canPreview = preview.kind === 'ossPreview' || preview.kind === 'filePreview' || preview.kind === 'invalid' || preview.kind === 'unsupported' || preview.kind === 'empty';
        return (
          <li key={`${preview.id || preview.src || preview.url || preview.ref || formatPlainRef(item)}-${index}`}>
            {canPreview ? (
              <FileAttachmentPreview
                presentation={PREVIEW_PRESENTATION.MODAL}
                fileId={preview.id}
                src={preview.src}
                fileName={preview.filename}
                FilePreview={FilePreview}
                FileButton={FileButton}
                FileDownload={FileDownload}
                formatMessage={formatMessage}
                emptyContent={emptyContent}
              />
            ) : (
              formatPlainRef(item)
            )}
          </li>
        );
      })}
    </ul>
  );
};

const FILE_PREVIEW_REMOTE_MODULES = ['components-core:FilePreview', 'components-core:File@FileButton', 'components-core:File@Download'];

export const RemoteFileAttachmentPreview = createWithRemoteLoader({
  modules: FILE_PREVIEW_REMOTE_MODULES
})(({ remoteModules, ...props }) => {
  const [FilePreview, FileButton, FileDownload] = remoteModules;
  return <FileAttachmentPreview FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} {...props} />;
});

export const RemoteMarkdownWithAttachments = createWithRemoteLoader({
  modules: FILE_PREVIEW_REMOTE_MODULES
})(({ remoteModules, ...props }) => {
  const [FilePreview, FileButton, FileDownload] = remoteModules;
  return <MarkdownWithAttachments FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} {...props} />;
});

export const RemoteEvidenceRefsList = createWithRemoteLoader({
  modules: FILE_PREVIEW_REMOTE_MODULES
})(({ remoteModules, ...props }) => {
  const [FilePreview, FileButton, FileDownload] = remoteModules;
  return <EvidenceRefsList FilePreview={FilePreview} FileButton={FileButton} FileDownload={FileDownload} {...props} />;
});

export default FileAttachmentPreview;
