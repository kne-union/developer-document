import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import withLocale from '../../withLocale';
import { useIntl } from '@kne/react-intl';
import styles from '@components/Shared/detailPage.module.scss';

const NotFound = withLocale(() => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  return (
    <div className={styles.narrowPage}>
      <div className={styles.sectionCard}>
        <Result
          status="404"
          title="404"
          subTitle={formatMessage({ id: 'notFound.subTitle' })}
          extra={
            <Button
              type="primary"
              onClick={() => {
                navigate('/');
              }}
            >
              {formatMessage({ id: 'common.backToHome' })}
            </Button>
          }
        />
      </div>
    </div>
  );
});

export default NotFound;
