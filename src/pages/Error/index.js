import { Space, Result, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import get from 'lodash/get';
import styles from '@components/Shared/detailPage.module.scss';

const subTitleEnum = {
  404: { title: '404', subTitle: '数据未找到' },
  403: { title: '403', subTitle: '您暂无权限，请联系管理员' },
  500: { title: '500', subTitle: '程序出现异常，请刷新后重试' }
};

const Error = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const status = location.status || searchParams.get('status') || 500;
  const msg = location.msg || searchParams.get('msg') || get(subTitleEnum[status], 'subTitle') || '';
  const navigate = useNavigate();

  return (
    <div className={styles.narrowPage}>
      <div className={styles.sectionCard}>
        <Result
          status={status}
          title={status || get(subTitleEnum[status], 'title') || 500}
          subTitle={msg}
          extra={
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  navigate('/');
                }}
              >
                返回首页
              </Button>
            </Space>
          }
        />
      </div>
    </div>
  );
};

export default Error;
