import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Empty, Space, Typography } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, DocumentDetailView } from '@components/Shared';
import styles from '../style.module.scss';

const { Title, Paragraph } = Typography;

const DocumentDetail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page']
})(
  withLocale(({ remoteModules, baseUrl: propsBaseUrl }) => {
    const [usePreset, Page] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const baseUrl = useMemo(() => {
      if (propsBaseUrl) return propsBaseUrl;
      const pathParts = location.pathname.split('/').filter(Boolean);
      return '/' + pathParts.slice(0, 2).join('/');
    }, [propsBaseUrl, location.pathname]);

    return (
      <Page name="document-detail">
        <Fetch
          {...Object.assign({}, apis.document.detail, { params: { id: searchParams.get('id') } })}
          render={({ data }) => {
            if (!data) {
              return (
                <div className={styles.detailPage}>
                  <div className={styles.noticePanel}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'document.detail.notExist' })} />
                  </div>
                </div>
              );
            }

            const isLoggedIn = hasUserToken();

            if (!isLoggedIn && !data.isPublic) {
              return (
                <div className={styles.detailPage}>
                  <div className={styles.noticePanel}>
                    <Title level={4}>{formatMessage({ id: 'document.detail.privateDoc' })}</Title>
                    <Paragraph>{formatMessage({ id: 'document.detail.loginToView' })}</Paragraph>
                    <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/account/login')}>
                      {formatMessage({ id: 'common.goLogin' })}
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <DocumentDetailView
                data={data}
                headerExtra={
                  <ShareButton
                    type="document"
                    id={data.id}
                    disabled={data.status !== 'published' || !data.isPublic}
                    disabledReason={!data.isPublic ? formatMessage({ id: 'document.detail.privateCannotShare' }) : formatMessage({ id: 'document.detail.unpublishedCannotShare' })}
                  />
                }
                footer={
                  <div className={styles.detailActions}>
                    <Space>
                      <Button type="primary" ghost icon={<ArrowLeftOutlined />} onClick={() => navigate(baseUrl)}>
                        {formatMessage({ id: 'common.backToList' })}
                      </Button>
                    </Space>
                  </div>
                }
              />
            );
          }}
        />
      </Page>
    );
  })
);

export default DocumentDetail;
