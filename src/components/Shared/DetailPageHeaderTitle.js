import { Flex } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { goAdminListBack } from '@components/Shared/goAdminDetail';
import styles from './detailPageHeaderTitle.module.scss';

const DetailPageHeaderTitle = createWithRemoteLoader({
  modules: ['components-core:Icon']
})(({ remoteModules, baseUrl, title }) => {
  const [Icon] = remoteModules;
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    goAdminListBack({ navigate, location, baseUrl });
  };

  return (
    <Flex gap={8} align="center">
      {baseUrl ? (
        <span
          className={styles['back-icon']}
          role="button"
          tabIndex={0}
          onClick={handleBack}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              handleBack();
            }
          }}
        >
          <Icon type="icon-arrow-thin-left" />
        </span>
      ) : null}
      <span className={styles['title-text']}>{title}</span>
    </Flex>
  );
});

export default DetailPageHeaderTitle;
