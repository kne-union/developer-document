import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Input, Result, Spin, Tag, Typography } from 'antd';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import styles from './style.module.scss';

const { Title, Text, Paragraph } = Typography;

// 会话内确认页（免登录）。URL 里的短码只是「查看凭证」，
// 签字凭证经带外通道投递，进入页面后立刻从地址栏摘掉，避免进入历史 / Referer / 访问日志。
// 规范里列表/表单/弹窗优先用远程组件，但这一页刻意不加载任何远程业务组件：
// 它可能由外部浏览器、IM 内嵌页打开，加载链越短越可靠，因此只用 antd 基础控件。
const apiRoot = () => {
  const runtimeRoot = (window.runtimeApiUrl || '').replace(/\/$/, '');
  return `${runtimeRoot || ''}/api/v1`;
};

const unwrap = json => {
  if (!json || typeof json !== 'object') return json;
  // 项目统一响应：code !== 0 时后端已经给了错误信息，不能当成功数据用
  if (typeof json.code === 'number' && json.code !== 0) {
    throw new Error(json.msg || json.message || `code ${json.code}`);
  }
  return 'data' in json ? json.data : json;
};

const remainingText = expiresAt => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diff)) return '';
  if (diff <= 0) return '已过期';
  const minutes = Math.floor(diff / 60000);
  if (minutes >= 60) return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
  return `${minutes} 分 ${Math.floor((diff % 60000) / 1000)} 秒`;
};

const FlowConfirmPage = withLocale(() => {
  const { token } = useParams();
  const { formatMessage } = useIntl();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState(null);
  const [answerToken, setAnswerToken] = useState('');
  const [assisted, setAssisted] = useState(false);
  const [authorizationRef, setAuthorizationRef] = useState('');
  const [answers, setAnswers] = useState({});
  const [editedChildren, setEditedChildren] = useState(null);
  const [tick, setTick] = useState(0);
  const [, setClock] = useState(0);
  const pollCount = useRef(0);

  // 签字凭证只在首次进入时从 query 取一次，随后立即清理地址栏
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sign = params.get('a') || '';
    setAnswerToken(sign);
    if (sign) {
      params.delete('a');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!detail) setLoading(true);
      setError('');
      try {
        const response = await fetch(`${apiRoot()}/flow/confirmation/${encodeURIComponent(token)}`, { credentials: 'include' });
        const json = await response.json();
        if (!response.ok) throw new Error(json?.message || json?.msg || json?.error || `HTTP ${response.status}`);
        const data = unwrap(json);
        if (!cancelled) {
          setDetail(data || null);
          setEditedChildren(previous => previous || (data?.treeDiff?.adding || []).map(item => ({ ...item })));
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick]);

  // pending 且 AI 尚未出稿时带退避轮询，避免短链打开后永远停在「等待草案」
  useEffect(() => {
    if (!detail || detail.status !== 'pending') return;
    const hasDraft = Boolean(detail.proposal?.summary || (detail.treeDiff?.adding || []).length || (detail.questions || []).length);
    if (hasDraft) return;
    const delay = Math.min(5000 * 2 ** pollCount.current, 30000);
    pollCount.current += 1;
    const timer = setTimeout(() => setTick(value => value + 1), delay);
    return () => clearTimeout(timer);
  }, [detail, tick]);

  useEffect(() => {
    const timer = setInterval(() => setClock(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const children = editedChildren || [];
  const updateChild = (index, key, value) => {
    setEditedChildren(list => (list || []).map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const submit = async nextDecision => {
    if (['reject', 'changes_requested'].includes(nextDecision) && !comment.trim()) {
      setError(formatMessage({ id: 'adminFlow.confirm.commentRequired' }));
      return;
    }
    if (!answerToken && !assisted) {
      setError(formatMessage({ id: 'adminFlow.confirmPage.signRequired' }));
      return;
    }
    if (assisted && !authorizationRef.trim()) {
      setError(formatMessage({ id: 'adminFlow.confirmPage.authorizationRef' }));
      return;
    }
    setSubmitting(true);
    setError('');
    const original = detail?.treeDiff?.adding || [];
    const changed = JSON.stringify(children) !== JSON.stringify(original);
    const answerList = Object.keys(answers).map(key => ({ key, answer: answers[key] }));
    const body = {
      decision: nextDecision,
      comment: comment.trim() || undefined,
      ...(answerToken ? { answerToken } : { assisted: true, authorizationRef: authorizationRef.trim() }),
      ...(answerList.length ? { answers: answerList } : {}),
      ...(changed ? { finalChildren: children, humanEdits: { children: true, editedAt: new Date().toISOString() } } : {})
    };
    try {
      const response = await fetch(`${apiRoot()}/flow/confirmation/${encodeURIComponent(token)}/answer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || json?.msg || json?.error || `HTTP ${response.status}`);
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

  if (!detail) {
    return (
      <div className={styles.page}>
        <Result status="info" title={formatMessage({ id: 'adminFlow.confirm.loadFailed' })} subTitle={formatMessage({ id: 'adminFlow.confirm.waitingForAiDraft' })} />
      </div>
    );
  }

  const alreadyDecided = detail.status !== 'pending';
  const current = detail.treeDiff?.current || [];
  const showDiff = children.length > 0 || current.length > 0;
  const canSubmit = Boolean(answerToken || assisted);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Title level={4} className={styles.title}>
          {formatMessage({ id: 'adminFlow.confirmPage.title' })}
        </Title>
        <Paragraph className={styles.subtitle}>{detail.nodeTitle || formatMessage({ id: 'adminFlow.confirmPage.subtitle' })}</Paragraph>
      </header>

      {alreadyDecided ? (
        <div className={styles.block}>
          <Result status="info" title={formatMessage({ id: 'adminFlow.confirm.alreadyDecided' })} subTitle={detail.status} />
          {detail.comment && <Paragraph>{detail.comment}</Paragraph>}
        </div>
      ) : (
        <>
          {answerToken ? (
            <Alert type="success" showIcon message={formatMessage({ id: 'adminFlow.confirmPage.signed' })} style={{ marginBottom: 16 }} />
          ) : (
            <Alert type="warning" showIcon message={formatMessage({ id: 'adminFlow.confirmPage.signRequired' })} style={{ marginBottom: 16 }} />
          )}

          {detail.proposal?.summary ? (
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
                  {formatMessage({ id: 'adminFlow.confirm.adding' })} ({children.length})
                </Text>
                <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
                  {formatMessage({ id: 'adminFlow.confirmPage.editHint' })}
                </Paragraph>
                {children.map((item, index) => (
                  <div key={index} className={styles.node}>
                    <Input value={item.title || ''} placeholder={formatMessage({ id: 'adminFlow.confirmPage.childTitle' })} onChange={event => updateChild(index, 'title', event.target.value)} />
                    {item.nodeType ? <Tag color="blue">{item.nodeType}</Tag> : null}
                    <Input.TextArea rows={2} value={item.scope || ''} placeholder={formatMessage({ id: 'adminFlow.confirmPage.childScope' })} onChange={event => updateChild(index, 'scope', event.target.value)} style={{ marginTop: 8 }} />
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className={styles.block}>
              <Text type="secondary">{formatMessage({ id: 'adminFlow.confirm.waitingForAiDraft' })}</Text>
              <Button size="small" style={{ marginLeft: 12 }} onClick={() => setTick(value => value + 1)}>
                {formatMessage({ id: 'adminFlow.confirmPage.refresh' })}
              </Button>
            </section>
          )}

          {(detail.questions || []).length > 0 ? (
            <section className={styles.block}>
              <Title level={5} className={styles.blockTitle}>
                {formatMessage({ id: 'adminFlow.confirm.questions' })}
              </Title>
              {detail.questions.map((question, index) => {
                const key = question.key || String(index);
                return (
                  <div key={key} className={styles.node}>
                    <Paragraph style={{ marginBottom: 8 }}>{question.question || question}</Paragraph>
                    <Input value={answers[key] || ''} placeholder={formatMessage({ id: 'adminFlow.confirmPage.answerPlaceholder' })} onChange={event => setAnswers(previous => ({ ...previous, [key]: event.target.value }))} />
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className={styles.block}>
            <Input.TextArea rows={3} value={comment} onChange={event => setComment(event.target.value)} placeholder={formatMessage({ id: 'adminFlow.confirm.commentPlaceholder' })} />
            {!answerToken ? (
              <div style={{ marginTop: 12 }}>
                <Checkbox checked={assisted} onChange={event => setAssisted(event.target.checked)}>
                  {formatMessage({ id: 'adminFlow.confirmPage.assisted' })}
                </Checkbox>
                {assisted ? <Input style={{ marginTop: 8 }} value={authorizationRef} placeholder={formatMessage({ id: 'adminFlow.confirmPage.authorizationRef' })} onChange={event => setAuthorizationRef(event.target.value)} /> : null}
              </div>
            ) : null}
            {error ? (
              <Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>
                {error}
              </Paragraph>
            ) : null}
            <div className={styles.actions}>
              <Button type="primary" className={styles.primary} loading={submitting} disabled={!canSubmit} onClick={() => submit('approve')}>
                {formatMessage({ id: 'adminFlow.confirm.agree' })}
              </Button>
              <div className={styles.secondary}>
                <Button loading={submitting} disabled={!canSubmit} onClick={() => submit('reject')}>
                  {formatMessage({ id: 'adminFlow.confirm.reject' })}
                </Button>
                <Button loading={submitting} disabled={!canSubmit} onClick={() => submit('changes_requested')}>
                  {formatMessage({ id: 'adminFlow.confirm.requestChanges' })}
                </Button>
              </div>
            </div>
          </section>
          <Paragraph className={styles.footer}>
            {formatMessage({ id: 'adminFlow.confirm.oneTimeHint' })}
            {remainingText(detail.expiresAt) ? ` · ${remainingText(detail.expiresAt)}` : ''}
          </Paragraph>
        </>
      )}
    </div>
  );
});

export default FlowConfirmPage;
