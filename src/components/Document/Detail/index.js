import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Empty, Space, Typography } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useCallback, useMemo } from 'react';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import { ShareButton, PrintButton, DocumentDetailView } from '@components/Shared';
import styles from '../style.module.scss';

const { Title, Paragraph } = Typography;

const findGroupPath = (nodes, code, parents = []) => {
  for (const node of nodes || []) {
    const path = [...parents, node.name];
    if (node.code === code) return path;
    const found = findGroupPath(node.children, code, path);
    if (found) return found;
  }
  return null;
};

const DocumentDetail = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Global@useGlobalValue']
})(
  withLocale(({ remoteModules, baseUrl: propsBaseUrl }) => {
    const [usePreset, Page, useGlobalValue] = remoteModules;
    const { apis, ajax } = usePreset();
    const locale = useGlobalValue('locale');
    const { formatMessage } = useIntl();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const baseUrl = useMemo(() => {
      if (propsBaseUrl) return propsBaseUrl;
      const pathParts = location.pathname.split('/').filter(Boolean);
      return '/' + pathParts.slice(0, 2).join('/');
    }, [propsBaseUrl, location.pathname]);

    const getDocumentLocation = useCallback(
      async groups => {
        let tree = [];
        if (groups?.length) {
          const { data: resData } = await ajax(Object.assign({}, apis.group.groupList, { params: { type: 'document', language: locale, output: 'tree' } }));
          tree = resData.code === 0 ? resData.data || [] : [];
        }
        const paths = (groups || []).map(group => (findGroupPath(tree, group.code) || [group.name]).join(' / '));
        return paths.length ? paths.join('；') : formatMessage({ id: 'document.list.allDocuments' });
      },
      [ajax, apis, locale, formatMessage]
    );

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
                  <Space>
                    <PrintButton title={data.name} theme="document" getSubtitle={() => getDocumentLocation(data.groups)} />
                    <ShareButton
                      type="document"
                      id={data.id}
                      disabled={data.status !== 'published' || !data.isPublic}
                      disabledReason={!data.isPublic ? formatMessage({ id: 'document.detail.privateCannotShare' }) : formatMessage({ id: 'document.detail.unpublishedCannotShare' })}
                    />
                  </Space>
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
