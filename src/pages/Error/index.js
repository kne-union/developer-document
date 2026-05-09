import { Space, Result, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import get from 'lodash/get';
import withLocale from '../../withLocale';
import { useIntl } from '@kne/react-intl';
import styles from '@components/Shared/detailPage.module.scss';

const Error = withLocale(() => {
  const { formatMessage } = useIntl();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const status = location.status || searchParams.get('status') || 500;
  const navigate = useNavigate();

  const subTitleEnum = {
    404: formatMessage({ id: 'error.404subTitle' }),
    403: formatMessage({ id: 'error.403subTitle' }),
    500: formatMessage({ id: 'error.500subTitle' })
  };

  const msg = location.msg || searchParams.get('msg') || subTitleEnum[status] || '';

  return (
    <div className={styles.narrowPage}>
      <div className={styles.sectionCard}>
        <Result
          status={status}
          title={status || 500}
          subTitle={msg}
          extra={
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  navigate('/');
                }}
              >
                {formatMessage({ id: 'common.backToHome' })}
              </Button>
            </Space>
          }
        />
      </div>
    </div>
  );
});

export default Error;
