import { Button, Tooltip, App } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import { useCallback } from 'react';
import { hasUserToken } from './auth';

const ShareButton = ({ type, id, disabled, disabledReason }) => {
  const isLoggedIn = hasUserToken();
  const { message } = App.useApp();

  const handleShare = useCallback(() => {
    if (disabled) return;
    const url = `${window.location.origin}/share?type=${type}&id=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        message.success('分享链接已复制到剪贴板');
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
          message.success('分享链接已复制到剪贴板');
        } catch {
          message.error('复制失败，请手动复制');
        }
        document.body.removeChild(textArea);
      });
  }, [type, id, disabled, message]);

  if (!isLoggedIn) {
    return null;
  }

  const btn = (
    <Button icon={<ShareAltOutlined />} onClick={handleShare} disabled={disabled}>
      分享
    </Button>
  );

  if (disabled && disabledReason) {
    return <Tooltip title={disabledReason}>{btn}</Tooltip>;
  }

  return btn;
};

export default ShareButton;
