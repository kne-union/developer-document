import { useId } from 'react';
import { theme } from 'antd';

// 默认铺满方形，由外层图标容器统一裁圆角；无容器时传 rounded，与 antd 方形 Avatar 圆角一致
const DefaultAppIcon = ({ size = '100%', rounded = false, className }) => {
  const gradientId = `default-app-icon-${useId().replace(/:/g, '')}`;
  const { token } = theme.useToken();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 72 72" style={{ display: 'block', borderRadius: rounded ? token.borderRadius : 0 }} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" fill={`url(#${gradientId})`} />
      <rect x="20" y="20" width="14" height="14" rx="4" fill="#fff" />
      <rect x="38" y="20" width="14" height="14" rx="4" fill="#fff" opacity="0.7" />
      <rect x="20" y="38" width="14" height="14" rx="4" fill="#fff" opacity="0.7" />
      <rect x="38" y="38" width="14" height="14" rx="4" fill="#fff" />
    </svg>
  );
};

export default DefaultAppIcon;
