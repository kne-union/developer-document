import { useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Modal, Select, Space, Steps, Tag, Typography, message } from 'antd';
import { LinkOutlined, ApiOutlined, RocketOutlined, InfoCircleOutlined, CopyOutlined, CodeOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { Link } from 'react-router-dom';
import { getToken } from '@kne/token-storage';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import styles from './style.module.scss';

const { Paragraph, Text } = Typography;

const MCP_TARGETS = [{ value: 'cursor', labelKey: 'adminDevManagement.install.mcpTarget.cursor' }];

const CodeBlock = ({ children }) => <pre className={styles.codeBlock}>{children}</pre>;

const CopySection = ({ title, content, onCopy, copyLabel }) => (
  <div className={styles.copySection}>
    <div className={styles.copySectionHeader}>
      <Text strong>{title}</Text>
      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => onCopy(content)}>
        {copyLabel}
      </Button>
    </div>
    <CodeBlock>{content}</CodeBlock>
  </div>
);

const resolveApiBase = () => {
  const root = (window.runtimeApiUrl || '').replace(/\/$/, '');
  return root ? `${root}/api/v1` : 'http://localhost:8061/api/v1';
};

const buildInitCommand = ({ apiV1, tokenValue, target }) =>
  `npx @kne/npm-tools initDevDocumentMcp \\
  --target ${target} \\
  --api-url ${apiV1} \\
  --token "${tokenValue}"`;

const buildMcpConfig = ({ mcpUrl, tokenValue }) =>
  JSON.stringify(
    {
      mcpServers: {
        'developer-document': {
          url: mcpUrl,
          headers: {
            'x-user-token': tokenValue
          }
        }
      }
    },
    null,
    2
  );

const InstallGuide = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:InfoPage']
})(
  withLocale(({ remoteModules, menu, baseUrl }) => {
    const [Page, InfoPage] = remoteModules;
    const { formatMessage } = useIntl();
    const [tokenModalOpen, setTokenModalOpen] = useState(false);
    const [mcpTarget, setMcpTarget] = useState(MCP_TARGETS[0].value);
    const apiV1 = resolveApiBase();
    const mcpUrl = `${apiV1}/mcp`;
    const token = getToken('X-User-Token') || '';
    const loggedIn = hasUserToken();

    const copyText = async text => {
      try {
        await navigator.clipboard.writeText(text);
        message.success(formatMessage({ id: 'adminDevManagement.install.copySuccess' }));
      } catch (error) {
        message.error(formatMessage({ id: 'adminDevManagement.install.copyFailed' }));
      }
    };

    const installParams = useMemo(() => {
      const tokenValue = token || formatMessage({ id: 'adminDevManagement.install.tokenPlaceholder' });
      return {
        tokenValue,
        initCommand: buildInitCommand({ apiV1, tokenValue, target: mcpTarget }),
        mcpJson: buildMcpConfig({ mcpUrl, tokenValue })
      };
    }, [apiV1, formatMessage, mcpTarget, mcpUrl, token]);

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

    const targetOptions = MCP_TARGETS.map(item => ({
      value: item.value,
      label: formatMessage({ id: item.labelKey })
    }));

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
                  <Text code>POST {apiV1}/account/login</Text>
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 12 }}>
                  {formatMessage({ id: 'adminDevManagement.install.step1TokenHint' })}
                </Paragraph>
              </InfoPage.Part>

              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.step2Title' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.step2Detail' })}</Paragraph>
                <div className={styles.targetRow}>
                  <Text type="secondary">{formatMessage({ id: 'adminDevManagement.install.mcpTargetLabel' })}</Text>
                  <Select className={styles.targetSelect} value={mcpTarget} options={targetOptions} onChange={setMcpTarget} />
                </div>
                <CopySection title={formatMessage({ id: 'adminDevManagement.install.initCommandTitle' })} content={installParams.initCommand} onCopy={copyText} copyLabel={formatMessage({ id: 'adminDevManagement.install.copy' })} />
                <Paragraph type="secondary" style={{ marginTop: 12 }}>
                  {formatMessage({ id: 'adminDevManagement.install.initCommandHint' })}
                  <Text className={styles.inlinePath}> ~/.kne_document/config.json</Text>
                  {formatMessage({ id: 'adminDevManagement.install.initSyncHint' })}
                </Paragraph>
              </InfoPage.Part>

              <InfoPage.Part title={formatMessage({ id: 'adminDevManagement.install.mcpConfigTitle' })}>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.mcpConfigDetail' })}</Paragraph>
                <CopySection title={formatMessage({ id: 'adminDevManagement.install.tokenModalMcpTitle' })} content={installParams.mcpJson} onCopy={copyText} copyLabel={formatMessage({ id: 'adminDevManagement.install.copy' })} />
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
            {!loggedIn ? (
              <Alert
                type="warning"
                showIcon
                message={formatMessage({ id: 'adminDevManagement.install.tokenModalLoginRequired' })}
                action={
                  <Button size="small" type="primary" href={`/account/login?referer=${encodeURIComponent(window.location.pathname)}`}>
                    {formatMessage({ id: 'common.goLogin' })}
                  </Button>
                }
              />
            ) : (
              <>
                <Paragraph type="secondary">{formatMessage({ id: 'adminDevManagement.install.tokenModalDesc' })}</Paragraph>
                <div className={styles.targetRow}>
                  <Text type="secondary">{formatMessage({ id: 'adminDevManagement.install.mcpTargetLabel' })}</Text>
                  <Select className={styles.targetSelect} value={mcpTarget} options={targetOptions} onChange={setMcpTarget} />
                </div>
                <Descriptions bordered size="small" column={1} className={styles.paramTable}>
                  <Descriptions.Item label="apiUrl">
                    <Space>
                      <Text code>{apiV1}</Text>
                      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(apiV1)} />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="mcpUrl">
                    <Space>
                      <Text code>{mcpUrl}</Text>
                      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(mcpUrl)} />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="x-user-token">
                    <Space align="start">
                      <Text code className={styles.tokenValue}>
                        {installParams.tokenValue}
                      </Text>
                      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(installParams.tokenValue)} />
                    </Space>
                  </Descriptions.Item>
                </Descriptions>

                <CopySection title={formatMessage({ id: 'adminDevManagement.install.initCommandTitle' })} content={installParams.initCommand} onCopy={copyText} copyLabel={formatMessage({ id: 'adminDevManagement.install.copy' })} />
                <CopySection title={formatMessage({ id: 'adminDevManagement.install.tokenModalMcpTitle' })} content={installParams.mcpJson} onCopy={copyText} copyLabel={formatMessage({ id: 'adminDevManagement.install.copy' })} />
              </>
            )}
          </Modal>
        </div>
      </Page>
    );
  })
);

export default InstallGuide;
