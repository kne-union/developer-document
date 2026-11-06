import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Input, Result, Spin, Tag, Typography } from 'antd';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import styles from './style.module.scss';

const { Title, Text, Paragraph } = Typography;

// 会话内一次性确认短链页（主路径，免登录）。
// 规范里列表/表单/弹窗优先用远程组件，但这一页刻意不加载任何远程业务组件：
// 它可能由外部浏览器、IM 内嵌页打开，加载链越短越可靠，因此只用 antd 基础控件。
const apiRoot = () => {
  const runtimeRoot = (window.runtimeApiUrl || '').replace(/\/$/, '');
  return `${runtimeRoot || ''}/api/v1`;
};

const unwrap = json => (json && typeof json === 'object' && 'data' in json ? json.data : json);

const FlowConfirmPage = withLocale(() => {
  const { token } = useParams();
  const { formatMessage } = useIntl();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${apiRoot()}/flow/confirmation/${encodeURIComponent(token)}`, { credentials: 'include' });
        const json = await response.json();
        if (!response.ok) throw new Error(json?.message || json?.error || `HTTP ${response.status}`);
        if (!cancelled) setDetail(unwrap(json));
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async nextDecision => {
    if (['reject', 'changes_requested'].includes(nextDecision) && !comment.trim()) {
      setError(formatMessage({ id: 'adminFlow.confirm.commentRequired' }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${apiRoot()}/flow/confirmation/${encodeURIComponent(token)}/answer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: nextDecision, comment: comment.trim() || undefined })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || json?.error || `HTTP ${response.status}`);
      setDecision({ ...unwrap(json), decision: nextDecision });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', paddingTop: 96 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className={styles.page}>
        <Result status="error" title={formatMessage({ id: 'adminFlow.confirm.loadFailed' })} subTitle={error} />
      </div>
    );
  }

  if (decision) {
    return (
      <div className={styles.page}>
        <Result status="success" title={formatMessage({ id: 'adminFlow.confirm.answered' })} subTitle={formatMessage({ id: 'adminFlow.confirm.backToChat' })} />
      </div>
    );
  }

  const alreadyDecided = detail?.status !== 'pending';
  const current = detail?.treeDiff?.current || [];
  const adding = detail?.treeDiff?.adding || [];
  const showDiff = adding.length > 0 || current.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Title level={4} className={styles.title}>
          {formatMessage({ id: 'adminFlow.confirmPage.title' })}
        </Title>
        <Paragraph className={styles.subtitle}>{detail?.nodeTitle || formatMessage({ id: 'adminFlow.confirmPage.subtitle' })}</Paragraph>
      </header>

      {alreadyDecided ? (
        <div className={styles.block}>
          <Result status="info" title={formatMessage({ id: 'adminFlow.confirm.alreadyDecided' })} subTitle={detail.status} />
          {detail.comment && <Paragraph>{detail.comment}</Paragraph>}
        </div>
      ) : (
        <>
          {detail?.proposal?.summary ? (
            <section className={styles.block}>
              <Title level={5} className={styles.blockTitle}>
                {formatMessage({ id: 'adminFlow.confirm.proposal' })}
              </Title>
              <div className={styles.markdown}>
                <MarkdownRender>{detail.proposal.summary}</MarkdownRender>
              </div>
            </section>
          ) : null}

          {showDiff ? (
            <section className={styles.block}>
              <Title level={5} className={styles.blockTitle}>
                {formatMessage({ id: 'adminFlow.confirm.treeDiff' })}
              </Title>
              {current.length > 0 ? (
                <div>
                  <Text type="secondary">{formatMessage({ id: 'adminFlow.confirm.current' })}</Text>
                  {current.map(item => (
                    <div key={item.id} className={styles.node}>
                      {item.title} <Tag>{item.nodeType}</Tag>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: current.length ? 16 : 0 }}>
                <Text type="secondary">
                  {formatMessage({ id: 'adminFlow.confirm.adding' })} ({adding.length})
                </Text>
                {adding.map((item, index) => (
                  <div key={index} className={styles.node}>
                    <Text strong>{item.title}</Text> {item.nodeType ? <Tag color="blue">{item.nodeType}</Tag> : null}
                    {item.scope ? <div className={styles.nodeNote}>{item.scope}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className={styles.block}>
              <Text type="secondary">{formatMessage({ id: 'adminFlow.confirm.waitingForAiDraft' })}</Text>
            </section>
          )}

          {(detail?.questions || []).length > 0 ? (
            <section className={styles.block}>
              <Title level={5} className={styles.blockTitle}>
                {formatMessage({ id: 'adminFlow.confirm.questions' })}
              </Title>
              {detail.questions.map((question, index) => (
                <div key={index} className={styles.node}>
                  {question.question || question}
                </div>
              ))}
            </section>
          ) : null}

          <section className={styles.block}>
            <Input.TextArea rows={3} value={comment} onChange={event => setComment(event.target.value)} placeholder={formatMessage({ id: 'adminFlow.confirm.commentPlaceholder' })} />
            {error ? (
              <Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>
                {error}
              </Paragraph>
            ) : null}
            <div className={styles.actions}>
              <Button type="primary" className={styles.primary} loading={submitting} onClick={() => submit('approve')}>
                {formatMessage({ id: 'adminFlow.confirm.agree' })}
              </Button>
              <div className={styles.secondary}>
                <Button loading={submitting} onClick={() => submit('reject')}>
                  {formatMessage({ id: 'adminFlow.confirm.reject' })}
                </Button>
                <Button loading={submitting} onClick={() => submit('changes_requested')}>
                  {formatMessage({ id: 'adminFlow.confirm.requestChanges' })}
                </Button>
              </div>
            </div>
          </section>
          <Paragraph className={styles.footer}>
            {formatMessage({ id: 'adminFlow.confirm.oneTimeHint' })}
            {detail?.expiresAt ? ` · ${detail.expiresAt}` : ''}
          </Paragraph>
        </>
      )}
    </div>
  );
});

export default FlowConfirmPage;
