import { useMemo, useState } from 'react';
import { Alert, Button, Descriptions, Modal, Select, Space, Tag, Typography, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import styles from './style.module.scss';

const { Paragraph, Text } = Typography;

export const MCP_TARGETS = [
  { value: 'cursor', labelKey: 'adminDevManagement.install.mcpTarget.cursor', hintKey: 'adminDevManagement.install.mcpTargetHint.cursor' },
  { value: 'workbuddy', labelKey: 'adminDevManagement.install.mcpTarget.workbuddy', hintKey: 'adminDevManagement.install.mcpTargetHint.workbuddy', transportType: 'http' }
];

export const USER_MCP_TOOLS = ['list_running_apps', 'get_app_open_api', 'call_app_api', 'search_document_index', 'fetch_docs', 'search_document', 'search_experience', 'get_prompt', 'search_worklog', 'upload_worklog', 'upload_experience'];

export const resolveSyncUrl = () => {
  const runtimeRoot = (window.runtimeApiUrl || '').replace(/\/$/, '');
  const root = runtimeRoot || window.location.origin.replace(/\/$/, '');
  return `${root}/api/v1`;
};

const buildInitCommand = ({ syncUrl, mcpUrl, tokenValue, target }) =>
  `npx @kne/npm-tools initDevDocumentMcp \\
  --target ${target} \\
  --sync-url ${syncUrl} \\
  --mcp-url ${mcpUrl} \\
  --token "${tokenValue}"`;

const buildMcpConfig = ({ mcpUrl, tokenValue, transportType }) =>
  JSON.stringify(
    {
      mcpServers: {
        'developer-document': {
          ...(transportType ? { type: transportType } : {}),
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${tokenValue}`
          }
        }
      }
    },
    null,
    2
  );

export const CopySection = ({ title, content, onCopy, copyLabel }) => (
  <div className={styles.copySection}>
    <div className={styles.copySectionHeader}>
      <Text strong>{title}</Text>
      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => onCopy(content)}>
        {copyLabel}
      </Button>
    </div>
    <pre className={styles.codeBlock}>{content}</pre>
  </div>
);

export const useMcpInstall = ({ ajax, apis }) => {
  const { formatMessage } = useIntl();
  const [mcpTarget, setMcpTarget] = useState(MCP_TARGETS[0].value);
  const [devToken, setDevToken] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const syncUrl = resolveSyncUrl();
  const mcpUrl = `${syncUrl}/mcp`;
  const token = devToken?.token || '';
  const currentTarget = MCP_TARGETS.find(item => item.value === mcpTarget) || MCP_TARGETS[0];

  const issueDevToken = async () => {
    setIssuing(true);
    try {
      const { data: resData } = await ajax(Object.assign({}, apis.devToken.issue));
      if (resData.code !== 0) {
        return;
      }
      setDevToken(resData.data);
      message.success(formatMessage({ id: 'adminDevManagement.install.issueTokenSuccess' }));
    } catch (error) {
      message.error(formatMessage({ id: 'adminDevManagement.install.issueTokenFailed' }));
    } finally {
      setIssuing(false);
    }
  };

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
      initCommand: buildInitCommand({ syncUrl, mcpUrl, tokenValue, target: currentTarget.value }),
      mcpJson: buildMcpConfig({ mcpUrl, tokenValue, transportType: currentTarget.transportType })
    };
  }, [formatMessage, currentTarget, mcpUrl, syncUrl, token]);

  return { mcpTarget, setMcpTarget, currentTarget, devToken, issuing, issueDevToken, copyText, syncUrl, mcpUrl, installParams };
};

export const McpTargetSelect = ({ install }) => {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.targetRow}>
      <Text type="secondary">{formatMessage({ id: 'adminDevManagement.install.mcpTargetLabel' })}</Text>
      <Select className={styles.targetSelect} value={install.mcpTarget} options={MCP_TARGETS.map(item => ({ value: item.value, label: formatMessage({ id: item.labelKey }) }))} onChange={install.setMcpTarget} />
    </div>
  );
};

export const McpTargetHint = ({ install }) => {
  const { formatMessage } = useIntl();
  return (
    <Paragraph type="secondary" style={{ marginTop: 12 }}>
      {formatMessage({ id: install.currentTarget.hintKey })}
    </Paragraph>
  );
};

export const InstallParamTable = ({ install }) => {
  const { formatMessage } = useIntl();
  const { syncUrl, mcpUrl, installParams, copyText } = install;
  return (
    <Descriptions bordered size="small" column={1} className={styles.paramTable}>
      <Descriptions.Item label={formatMessage({ id: 'adminDevManagement.install.syncUrlLabel' })}>
        <Space>
          <Text code>{syncUrl}</Text>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(syncUrl)} />
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label={formatMessage({ id: 'adminDevManagement.install.mcpUrlLabel' })}>
        <Space>
          <Text code>{mcpUrl}</Text>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(mcpUrl)} />
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label={formatMessage({ id: 'adminDevManagement.install.tokenLabel' })}>
        <Space align="start">
          <Text code className={styles.tokenValue}>
            {installParams.tokenValue}
          </Text>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyText(installParams.tokenValue)} />
        </Space>
      </Descriptions.Item>
    </Descriptions>
  );
};

export const McpInstallContent = ({ install, description, tools }) => {
  const { formatMessage } = useIntl();
  const { devToken, issuing, issueDevToken, installParams, copyText } = install;
  const copyLabel = formatMessage({ id: 'adminDevManagement.install.copy' });

  if (!hasUserToken()) {
    return (
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
    );
  }

  return (
    <>
      <Paragraph type="secondary">{description || formatMessage({ id: 'adminDevManagement.install.tokenModalDesc' })}</Paragraph>
      <Space className={styles.targetRow} wrap>
        <Button type={devToken ? 'default' : 'primary'} loading={issuing} onClick={issueDevToken}>
          {formatMessage({ id: devToken ? 'adminDevManagement.install.reissueToken' : 'adminDevManagement.install.issueToken' })}
        </Button>
        {devToken && <Text type="secondary">{formatMessage({ id: 'adminDevManagement.install.tokenExpiresAt' }, { time: new Date(devToken.expiresAt).toLocaleString() })}</Text>}
      </Space>
      <McpTargetSelect install={install} />
      <InstallParamTable install={install} />
      <CopySection title={formatMessage({ id: 'adminDevManagement.install.initCommandTitle' })} content={installParams.initCommand} onCopy={copyText} copyLabel={copyLabel} />
      <CopySection title={formatMessage({ id: 'adminDevManagement.install.tokenModalMcpTitle' })} content={installParams.mcpJson} onCopy={copyText} copyLabel={copyLabel} />
      <McpTargetHint install={install} />
      {tools && (
        <div className={styles.toolList}>
          {tools.map(tool => (
            <Tag key={tool} color="processing">
              {tool}
            </Tag>
          ))}
        </div>
      )}
    </>
  );
};

export const McpInstallModal = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, open, onCancel, description, tools }) => {
    const [usePreset] = remoteModules;
    const { ajax, apis } = usePreset();
    const { formatMessage } = useIntl();
    const install = useMcpInstall({ ajax, apis });
    return (
      <Modal title={formatMessage({ id: 'adminDevManagement.install.installInfoTitle' })} open={open} onCancel={onCancel} footer={null} width={760} destroyOnClose>
        <McpInstallContent install={install} description={description} tools={tools} />
      </Modal>
    );
  })
);
