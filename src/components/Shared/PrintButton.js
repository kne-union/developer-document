import { Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useCallback, useRef, useState } from 'react';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from './auth';

const THEMES = {
  blog: { primary: '#6d5dfc', secondary: '#3b82f6', soft: '#f3f0ff' },
  document: { primary: '#0891b2', secondary: '#10b981', soft: '#ecfeff' }
};

const FOLDER_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 6.5A2.5 2.5 0 0 1 5.5 4h3.59a2 2 0 0 1 1.42.59L12.4 6.5h6.1A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z'/%3E%3C/svg%3E")`;

// 页面主体是固定高度的滚动容器，直接 window.print() 只能打出首屏；
// 因此把正文克隆进独立 iframe（文档流自然撑开），套用独立的打印版式再打印。
const PRINT_STYLE = `
@page { size: A4; margin: 18mm 16mm 20mm; }
html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
body { margin: 0; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.print-header { position: relative; overflow: hidden; margin-bottom: 28px; padding: 30px 32px 26px; border-radius: 16px; background: linear-gradient(135deg, var(--print-soft) 0%, #ffffff 68%); break-inside: avoid; }
.print-header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--print-primary) 0%, var(--print-secondary) 100%); }
.print-header-ring { position: absolute; border-radius: 50%; pointer-events: none; }
.print-header-ring.is-outer { top: -90px; right: -60px; width: 240px; height: 240px; border: 1px solid var(--print-primary); opacity: 0.14; }
.print-header-ring.is-inner { top: -40px; right: -10px; width: 140px; height: 140px; background: radial-gradient(circle, var(--print-primary) 0%, transparent 70%); opacity: 0.12; }
.print-header-dots { position: absolute; right: 36px; bottom: 22px; width: 72px; height: 40px; background-image: radial-gradient(var(--print-primary) 1.2px, transparent 1.2px); background-size: 12px 12px; opacity: 0.25; }
.print-title { position: relative; margin: 0; max-width: 85%; color: #0f172a; font-size: 28px; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; }
.print-subtitle { position: relative; display: inline-flex; align-items: center; gap: 8px; max-width: 85%; margin: 12px 0 0; padding: 4px 12px 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.75); box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06); color: #475569; font-size: 12.5px; line-height: 1.6; }
.print-subtitle::before { content: ''; flex: none; width: 14px; height: 14px; background: var(--print-primary); -webkit-mask: ${FOLDER_ICON} center / contain no-repeat; mask: ${FOLDER_ICON} center / contain no-repeat; }
.print-subtitle:empty { display: none; }
.print-divider { position: relative; display: flex; align-items: center; gap: 10px; margin-top: 18px; }
.print-divider::before { content: ''; width: 44px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--print-primary), var(--print-secondary)); }
.print-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--print-primary), transparent); opacity: 0.25; }

.print-body { padding: 0 4px; font-size: 14.5px; line-height: 1.85; word-break: break-word; }
.print-body, .print-body * { color: #334155; animation: none !important; transition: none !important; }
.print-body .ck-content { padding: 0 !important; border: none !important; font-size: inherit !important; line-height: inherit !important; }
.print-body h1, .print-body h2, .print-body h3, .print-body h4 { color: #0f172a !important; font-weight: 700; line-height: 1.4; break-after: avoid; }
.print-body h1 { margin: 28px 0 14px; font-size: 22px; }
.print-body h2 { margin: 26px 0 12px; padding-left: 12px; border-left: 4px solid var(--print-primary); font-size: 19px; }
.print-body h3 { margin: 22px 0 10px; font-size: 16.5px; }
.print-body h4 { margin: 18px 0 8px; font-size: 15px; }
.print-body p { margin: 0 0 12px; }
.print-body a { color: var(--print-primary) !important; text-decoration: none; border-bottom: 1px solid var(--print-soft); }
.print-body blockquote { margin: 16px 0; padding: 10px 16px; border: none; border-left: 3px solid var(--print-primary); border-radius: 0 8px 8px 0; background: var(--print-soft); }
.print-body blockquote, .print-body blockquote * { color: #475569; }
.print-body code { padding: 1px 6px; border-radius: 4px; background: #f1f5f9; color: #0f172a; font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 0.9em; }
.print-body pre { margin: 14px 0; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc !important; white-space: pre-wrap !important; overflow: visible !important; }
.print-body pre code { padding: 0; background: none; font-size: 12.5px; line-height: 1.7; }
.print-body table { width: 100%; margin: 14px 0; border-collapse: collapse; overflow: visible !important; font-size: 13px; }
.print-body th, .print-body td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
.print-body th { background: var(--print-soft); color: #0f172a; font-weight: 600; }
.print-body ul, .print-body ol { margin: 0 0 12px; padding-left: 22px; }
.print-body li { margin: 4px 0; }
.print-body hr { margin: 24px 0; border: none; height: 1px; background: #e2e8f0; }
.print-body img, .print-body video { max-width: 100% !important; height: auto !important; border-radius: 8px; }
.print-body img, .print-body figure, .print-body pre, .print-body tr, .print-body blockquote { break-inside: avoid; }
`;

const waitForResources = doc => {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).filter(link => !link.sheet);
  const images = Array.from(doc.images).filter(img => !img.complete);
  const pending = [...links, ...images].map(
    el =>
      new Promise(resolve => {
        el.addEventListener('load', resolve, { once: true });
        el.addEventListener('error', resolve, { once: true });
      })
  );
  return Promise.race([Promise.all(pending), new Promise(resolve => setTimeout(resolve, 3000))]);
};

const PrintButton = withLocale(({ title, theme = 'blog', getSubtitle }) => {
  const { formatMessage } = useIntl();
  const btnRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = useCallback(async () => {
    const body = btnRef.current?.closest('[data-print-root]')?.querySelector('[data-print-body]');
    if (!body) return;
    setLoading(true);
    const subtitle = getSubtitle ? await Promise.resolve(getSubtitle()).catch(() => '') : '';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, { position: 'fixed', left: '-10000px', top: '0', width: '800px', height: '600px', border: '0' });
    document.body.appendChild(iframe);

    const { primary, secondary, soft } = THEMES[theme] || THEMES.blog;
    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('');
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html lang="${document.documentElement.lang || 'zh-CN'}"><head><meta charset="utf-8"><base href="${window.location.origin}/"><title></title>${headStyles}<style>${PRINT_STYLE}</style></head>` +
        `<body style="--print-primary:${primary};--print-secondary:${secondary};--print-soft:${soft}">` +
        `<header class="print-header"><span class="print-header-ring is-outer"></span><span class="print-header-ring is-inner"></span><span class="print-header-dots"></span><h1 class="print-title"></h1><p class="print-subtitle"></p><div class="print-divider"></div></header>` +
        `<main class="print-body"></main></body></html>`
    );
    doc.close();
    doc.title = title || document.title;
    doc.querySelector('.print-title').textContent = title || '';
    doc.querySelector('.print-subtitle').textContent = subtitle || '';
    doc.querySelector('.print-body').innerHTML = body.innerHTML;

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      setLoading(false);
      setTimeout(() => iframe.remove(), 500);
    };

    await waitForResources(doc);
    const win = iframe.contentWindow;
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // 部分浏览器不触发 afterprint
    setTimeout(cleanup, 60000);
  }, [title, theme, getSubtitle]);

  if (!hasUserToken()) {
    return null;
  }

  return (
    <Button ref={btnRef} icon={<PrinterOutlined />} loading={loading} onClick={handlePrint}>
      {formatMessage({ id: 'shared.printButton.buttonText' })}
    </Button>
  );
});

export default PrintButton;
