import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { App, Empty } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { confirmStatusMessageId } from '../constants';
import { toSelectOption, selectValueOf } from '../selectValue';

// 确认请求是备用入口：主路径是 AI 会话里的一次性短链。
// 没有 AI 草案时不提供空白编辑器，避免退化成「人自己拆、AI 记一下」。
const Confirmation = createWithRemoteLoader({
  modules: ['components-core:Layout@Page', 'components-core:InfoPage', 'components-core:TablePage@Table', 'components-core:FormInfo', 'components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, baseUrl, menu, ...props }) => {
    const [Page, InfoPage, Table, FormInfo, useFormModal, usePreset] = remoteModules;
    const { SuperSelect, TextArea } = FormInfo.fields;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();

    const openDecision = (item, reload) => {
      const decisionOptions = [
        { label: formatMessage({ id: 'adminFlow.confirm.agree' }), value: 'approve' },
        { label: formatMessage({ id: 'adminFlow.confirm.reject' }), value: 'reject' },
        { label: formatMessage({ id: 'adminFlow.confirm.requestChanges' }), value: 'changes_requested' }
      ];
      formModal({
        title: formatMessage({ id: 'adminFlow.confirm.decide' }),
        size: 'small',
        formProps: {
          data: { decision: toSelectOption('approve', decisionOptions), comment: '' },
          onSubmit: async formData => {
            const decision = selectValueOf(formData.decision);
            if (['reject', 'changes_requested'].includes(decision) && !String(formData.comment || '').trim()) {
              message.warning(formatMessage({ id: 'adminFlow.confirm.commentRequired' }));
              return false;
            }
            const { data: resData } = await ajax(
              Object.assign({}, apis.flow.confirmationAnswer, {
                data: { id: item.id, decision, comment: String(formData.comment || '').trim() || undefined }
              })
            );
            if (resData.code !== 0) return false;
            message.success(formatMessage({ id: 'adminFlow.confirm.answered' }));
            reload();
            return true;
          }
        },
        children: (
          <FormInfo
            list={[
              <SuperSelect name="decision" label={formatMessage({ id: 'adminFlow.confirm.decide' })} rule="REQ" single interceptor="object-output-value" options={decisionOptions} />,
              <TextArea name="comment" label={formatMessage({ id: 'adminFlow.confirm.comment' })} placeholder={formatMessage({ id: 'adminFlow.confirm.commentPlaceholder' })} rows={3} block />
            ]}
          />
        )
      });
    };

    return (
      <Page {...props} menu={menu || null} title={formatMessage({ id: 'adminFlow.confirm.centerTitle' })}>
        <Fetch
          {...Object.assign({}, apis.flow.confirmationList, { params: { perPage: 50 } })}
          render={({ data, reload }) => {
            const list = Array.isArray(data) ? data : data?.pageData || [];
            return (
              <InfoPage>
                <InfoPage.Part subtitle={formatMessage({ id: 'adminFlow.confirm.centerHint' })}>
                  {!list.length ? (
                    <Empty description={formatMessage({ id: 'adminFlow.confirm.empty' })} />
                  ) : (
                    <Table
                      dataSource={list}
                      columns={[
                        { name: 'subject', title: formatMessage({ id: 'adminFlow.confirm.table.subject' }), renderType: 'main', getValueOf: item => item.proposal?.summary || item.subject || '-' },
                        { name: 'nodeTitle', title: formatMessage({ id: 'adminFlow.confirm.table.node' }), getValueOf: item => item.nodeTitle || item.nodeId || '-' },
                        {
                          name: 'status',
                          title: formatMessage({ id: 'adminFlow.confirm.table.status' }),
                          renderType: 'status',
                          getValueOf: item => ({
                            type: item.status === 'approved' ? 'success' : item.status === 'pending' ? 'processing' : 'default',
                            text: formatMessage({ id: confirmStatusMessageId(item.status), defaultMessage: item.status })
                          })
                        },
                        { name: 'createdAt', title: formatMessage({ id: 'adminFlow.confirm.table.time' }), format: 'datetime', getValueOf: item => item.createdAt || null },
                        {
                          name: 'options',
                          title: formatMessage({ id: 'adminFlow.confirm.table.options' }),
                          renderType: 'options',
                          fixed: 'right',
                          getValueOf: item => (item.status === 'pending' ? [{ children: formatMessage({ id: 'adminFlow.confirm.decide' }), onClick: () => openDecision(item, reload) }] : [])
                        }
                      ]}
                    />
                  )}
                </InfoPage.Part>
              </InfoPage>
            );
          }}
        />
      </Page>
    );
  })
);

export default Confirmation;
