import { createWithRemoteLoader } from '@kne/remote-loader';
import { App, Button } from 'antd';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { STAGE_CODES, stageMessageId } from '../constants';
import { toSelectOption, selectValueOf } from '../selectValue';

const getStageOptions = formatMessage => [{ label: formatMessage({ id: 'adminFlow.pause.stageAll' }), value: '' }, ...STAGE_CODES.map(code => ({ label: formatMessage({ id: stageMessageId(code) }), value: code }))];

// 暂停 / 恢复弹窗内容：reason 必填，支持 stage 级，暂停可选释放租约
const PauseInner = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(
  withLocale(({ remoteModules, mode }) => {
    const [FormInfo] = remoteModules;
    const { SuperSelect, TextArea, Switch } = FormInfo.fields;
    const { formatMessage } = useIntl();

    const stageOptions = getStageOptions(formatMessage);

    return (
      <FormInfo
        list={[
          <TextArea name="reason" label={formatMessage({ id: 'adminFlow.pause.reason' })} rule={mode === 'pause' ? 'REQ LEN-2-500' : 'LEN-0-500'} placeholder={formatMessage({ id: 'adminFlow.pause.reasonPlaceholder' })} block />,
          <SuperSelect name="stage" label={formatMessage({ id: 'adminFlow.pause.stage' })} single interceptor="object-output-value" options={stageOptions} block description={formatMessage({ id: 'adminFlow.pause.stageHint' })} />,
          mode === 'pause' ? <Switch name="releaseLease" label={formatMessage({ id: 'adminFlow.pause.releaseLease' })} description={formatMessage({ id: 'adminFlow.pause.releaseLeaseHint' })} /> : null
        ].filter(Boolean)}
      />
    );
  })
);

// 暂停（flow:write 保守动作）与恢复：人走 adminAuth，无需确认凭证
const Pause = createWithRemoteLoader({
  modules: ['components-core:FormInfo@useFormModal', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, data, onSuccess, mode, ...props }) => {
    const [useFormModal, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const isPause = mode === 'pause';
    const stageOptions = getStageOptions(formatMessage);

    return (
      <Button
        {...props}
        onClick={() => {
          formModal({
            title: formatMessage({ id: isPause ? 'adminFlow.pause.pauseTitle' : 'adminFlow.pause.resumeTitle' }),
            size: 'small',
            formProps: {
              // 默认「全部阶段」也要是完整选项对象：既回显，也避免拦截器拿到空值
              data: { stage: toSelectOption('', stageOptions) },
              onSubmit: async formData => {
                const payload = { nodeId: data.id, reason: formData.reason || '' };
                const stage = selectValueOf(formData.stage);
                if (stage) {
                  payload.stage = stage;
                }
                if (isPause) {
                  payload.releaseLease = !!formData.releaseLease;
                }
                const { data: resData } = await ajax(Object.assign({}, isPause ? apis.flow.pause : apis.flow.resume, { data: payload }));
                if (resData.code !== 0) {
                  return false;
                }
                message.success(formatMessage({ id: 'adminFlow.pause.success' }));
                onSuccess && onSuccess();
              }
            },
            children: <PauseInner mode={mode} />
          });
        }}
      />
    );
  })
);

export default Pause;
