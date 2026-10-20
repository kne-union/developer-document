import { useState } from 'react';
import { Alert, Button, Card, Modal, Space, Steps, Tag, Typography } from 'antd';
import { LinkOutlined, ApiOutlined, RocketOutlined, InfoCircleOutlined, CodeOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Link } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { CopySection, InstallParamTable, McpInstallContent, McpTargetHint, McpTargetSelect, useMcpInstall } from '@components/Shared/McpInstall';
import styles from './style.module.scss';

const { Paragraph, Text } = Typography;

const InstallGuide = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:InfoPage', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, menu, baseUrl }) => {
    const [Page, InfoPage, usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { formatMessage } = useIntl();
    const [tokenModalOpen, setTokenModalOpen] = useState(false);
    const install = useMcpInstall({ ajax, apis });
    const { syncUrl, installParams, copyText } = install;
    const copyLabel = formatMessage({ id: 'adminDevManagement.install.copy' });

    const stepItems = [
      {
        title: formatMessage({ id: 'adminDevManagement.install.step1Title' }),
        description: formatMessage({ id: 'adminDevManagement.install.step1Desc' }),
        icon: <RocketOutlined />
      },
      {
        title: formatMessage({ id: 'adminDevManagement.install.step2Title' }),
        description: formatMessage({ id: 'adminDevManagement.install.step2Desc' }),
        icon: <CodeOutlined />
      },
      {
        title: formatMessage({ id: 'adminDevManagement.install.step3Title' }),
        description: formatMessage({ id: 'adminDevManagement.install.step3Desc' }),
        icon: <ApiOutlined />
      }
    ];

    const mcpTools = ['check_worklog_exists', 'check_experience_exists', 'upload_experience', 'upload_worklog', 'search_experience', 'search_document_index', 'search_document'];

    return (
      <Page menu={menu} title={formatMessage({ id: 'adminDevManagement.install.pageTitle' })}>
        <div className={styles.installGuide}>
          <Alert className={styles.hero} type="info" showIcon message={formatMessage({ id: 'adminDevManagement.install.heroTitle' })} description={formatMessage({ id: 'adminDevManagement.install.heroDesc' })} />

          <Card bordered={false} className={styles.stepCard} styles={{ body: { padding: '20px 24px' } }}>
            <Steps direction="vertical" size="small" current={-1} items={stepItems} />
          </Card>

          <div className={styles.actionBar}>
            <Button type="primary" icon={<InfoCircleOutlined />} onClick={() => setTokenModalOpen(true)}>
              {formatMessage({ id: 'adminDevManagement.install.getInstallInfo' })}
            </Button>
          </div>

          <div className={styles.infoSections}>
            <InfoPage>
              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.step1Title' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.step1Detail' })}</Paragraph>
                <Paragraph>
                  <Text code>POST {syncUrl}/dev-token/issue</Text>
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 12 }}>
                  {formatMessage({ id: 'adminDevManagement.install.step1TokenHint' })}
                </Paragraph>
              </InfoPage.Part>

              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.step2Title' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.step2Detail' })}</Paragraph>
                <McpTargetSelect install={install} />
                <InstallParamTable install={install} />
                <CopySection title={formatMessage({ id: 'adminDevManagement.install.initCommandTitle' })} content={installParams.initCommand} onCopy={copyText} copyLabel={copyLabel} />
                <Paragraph type="secondary" style={{ marginTop: 12 }}>
                  {formatMessage({ id: 'adminDevManagement.install.initCommandHint' })}
                  <Text className={styles.inlinePath}> ~/.kne_document/config.json</Text>
                  {formatMessage({ id: 'adminDevManagement.install.initSyncHint' })}
                </Paragraph>
              </InfoPage.Part>

              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.mcpConfigTitle' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.mcpConfigDetail' })}</Paragraph>
                <CopySection title={formatMessage({ id: 'adminDevManagement.install.tokenModalMcpTitle' })} content={installParams.mcpJson} onCopy={copyText} copyLabel={copyLabel} />
                <McpTargetHint install={install} />
                <div className={styles.toolList}>
                  {mcpTools.map(tool => (
                    <Tag key={tool} color="processing">
                      {tool}
                    </Tag>
                  ))}
                </div>
              </InfoPage.Part>

              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.step3Title' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.step3Detail' })}</Paragraph>
                <Space direction="vertical" size={4} className={styles.footerLinks}>
                  <Link to={`${baseUrl}/experience`}>
                    <LinkOutlined /> {formatMessage({ id: 'app.adminNav.experience' })}
                  </Link>
                  <Link to={`${baseUrl}/worklog`}>
                    <LinkOutlined /> {formatMessage({ id: 'app.adminNav.worklog' })}
                  </Link>
                  <Link to={`${baseUrl}/search-analytics`}>
                    <LinkOutlined /> {formatMessage({ id: 'app.adminNav.searchAnalytics' })}
                  </Link>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                  {formatMessage({ id: 'adminDevManagement.install.zipHint' })}
                </Paragraph>
              </InfoPage.Part>
            </InfoPage>
          </div>

          <Modal title={formatMessage({ id: 'adminDevManagement.install.installInfoTitle' })} open={tokenModalOpen} onCancel={() => setTokenModalOpen(false)} footer={null} width={760} destroyOnClose>
            <McpInstallContent install={install} />
          </Modal>
        </div>
      </Page>
    );
  })
);

export default InstallGuide;
