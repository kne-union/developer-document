import { Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { App } from 'antd';

const OpenSource = withLocale(({ data, ...props }) => {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  return (
    <Button
      {...props}
      type="link"
      onClick={() => {
        if (!data?.sourceUrl) {
          message.warning(formatMessage({ id: 'adminBlog.leads.noSourceUrl' }));
          return;
        }
        window.open(data.sourceUrl, '_blank', 'noopener,noreferrer');
      }}
    />
  );
});

export default OpenSource;
