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

    // 与 server/libs/mcp 实际注册保持一致：基础检索 10 个 + 流程管理六组 29 个
    const mcpTools = [
      'check_worklog_exists',
      'check_experience_exists',
      'upload_experience',
      'upload_worklog',
      'search_experience',
      'search_document_index',
      'search_document',
      'fetch_docs',
      'search_worklog',
      'get_prompt',
      // 流程管理 · 只读
      'flow_list',
      'flow_get_context',
      'flow_get_templates',
      'flow_check_exit',
      'flow_get_run',
      // 流程管理 · 写入（flow:write）
      'flow_start_run',
      'flow_save_deliverables',
      'flow_submit_deliverables',
      'flow_finish_run',
      'flow_create',
      'flow_update',
      'flow_archive',
      // 流程管理 · 裂变
      'flow_propose_decomposition',
      'flow_apply_decomposition',
      // 流程管理 · 派单与暂停
      'flow_claim_task',
      'flow_peek_queue',
      'flow_heartbeat_task',
      'flow_complete_task',
      'flow_pause_task',
      'flow_resume_task',
      // 流程管理 · 真人确认
      'flow_request_confirmation',
      'flow_get_confirmation',
      'flow_cancel_confirmation',
      'flow_list_my_confirmations',
      // 流程管理 · 放行（flow:release）
      'flow_release_check',
      'flow_release_review',
      'flow_release_waive',
      'flow_release_transition',
      'flow_release_undo',
      // 技能 / 规则管理
      'search_skill',
      'get_skill',
      'create_skill',
      'update_skill',
      'delete_skill',
      'export_skills'
    ];

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
                  <Link to={`${baseUrl}/skill`}>
                    <LinkOutlined /> {formatMessage({ id: 'app.adminNav.skill' })}
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
