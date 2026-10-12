import { useCallback } from 'react';
import { App } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useIntl } from '@kne/react-intl';
import style from './style.module.scss';

export const getAppEntries = app => (Array.isArray(app?.entries) ? app.entries : []);

const openUrl = url => {
  if (url) {
    window.open(url, '_blank', 'noopener');
  }
};

/** 无入口或只有一个入口直接打开；多个入口弹窗让用户选择 */
export const useOpenApp = () => {
  const { modal } = App.useApp();
  const { formatMessage } = useIntl();

  return useCallback(
    app => {
      const entries = getAppEntries(app);
      if (entries.length <= 1) {
        openUrl(entries[0]?.url || app?.pathUrl);
        return;
      }
      const instance = modal.info({
        title: formatMessage({ id: 'appEntry.selectTitle' }, { name: app.label || app.name }),
        icon: null,
        centered: true,
        closable: true,
        maskClosable: true,
        footer: null,
        content: (
          <div className={style['entries']}>
            {entries.map(entry => (
              <button
                type="button"
                key={entry.path}
                className={style['entry']}
                onClick={() => {
                  instance.destroy();
                  openUrl(entry.url);
                }}
              >
                <span className={style['entry-text']}>
                  <span className={style['entry-label']}>{entry.label}</span>
                  <span className={style['entry-path']}>{entry.path}</span>
                </span>
                <RightOutlined className={style['entry-arrow']} />
              </button>
            ))}
          </div>
        )
      });
    },
    [modal, formatMessage]
  );
};

export const OpenAppLink = ({ app, className, children }) => {
  const openApp = useOpenApp();
  const entries = getAppEntries(app);
  const href = entries.length === 1 ? entries[0].url : app?.pathUrl;
  if (!href) {
    return null;
  }
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={
        entries.length > 1
          ? e => {
              e.preventDefault();
              openApp(app);
            }
          : undefined
      }
    >
      {children}
    </a>
  );
};
