import { Button, Tooltip, App } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import { useCallback } from 'react';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from './auth';

const ShareButton = withLocale(({ type, id, disabled, disabledReason }) => {
  const isLoggedIn = hasUserToken();
  const { message } = App.useApp();
  const { formatMessage } = useIntl();

  const handleShare = useCallback(() => {
    if (disabled) return;
    const url = `${window.location.origin}/share?type=${type}&id=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        message.success(formatMessage({ id: 'shared.shareButton.copySuccess' }));
      })
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          message.success(formatMessage({ id: 'shared.shareButton.copySuccess' }));
        } catch {
          message.error(formatMessage({ id: 'shared.shareButton.copyFailed' }));
        }
        document.body.removeChild(textArea);
      });
  }, [type, id, disabled, message, formatMessage]);

  if (!isLoggedIn) {
    return null;
  }

  const btn = (
    <Button icon={<ShareAltOutlined />} onClick={handleShare} disabled={disabled}>
      {formatMessage({ id: 'shared.shareButton.buttonText' })}
    </Button>
  );

  if (disabled && disabledReason) {
    return <Tooltip title={disabledReason}>{btn}</Tooltip>;
  }

  return btn;
});

export default ShareButton;
