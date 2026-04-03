import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from '@components/Shared/detailPage.module.scss';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.narrowPage}>
      <div className={styles.sectionCard}>
        <Result
          status="404"
          title="404"
          subTitle="访问的页面不存在"
          extra={
            <Button
              type="primary"
              onClick={() => {
                navigate('/');
              }}
            >
              返回首页
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default NotFound;
