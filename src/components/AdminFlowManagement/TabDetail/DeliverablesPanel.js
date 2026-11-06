import { useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { App, Button, Dropdown, Empty, Space, Tag } from 'antd';
import { CheckCircleFilled, LinkOutlined, MinusCircleOutlined, MoreOutlined, PaperClipOutlined } from '@ant-design/icons';
import MarkdownRender from '@kne/markdown-components-render';
import '@kne/markdown-components-render/dist/index.css';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { DELIVERABLE_STATUS_COLOR, deliverableStatusMessageId, producedByMessageId, templateNameId, templateCriteriaId } from '../constants';
import { toSelectOption, selectValueOf } from '../selectValue';
import styles from '../style.module.scss';

const getMaterialTypeOptions = formatMessage => [
  { label: formatMessage({ id: 'adminFlow.deliverable.material.file' }), value: 'file' },
  { label: formatMessage({ id: 'adminFlow.deliverable.material.url' }), value: 'url' },
  { label: formatMessage({ id: 'adminFlow.deliverable.material.text' }), value: 'text' }
];

// 多材料里每种类型的标签色，让「这段是链接还是正文」一眼可分
const MATERIAL_TYPE_COLOR = { file: 'blue', url: 'cyan', text: 'default' };

// 编辑字段按 contentType 映射；所有长文本统一走 components-admin:Editor 的 Markdown 模式。
// 必填口径与后端 validateOptions 对齐：type / label 必填，且 file 需 fileId+fileName、
// url 需 http(s)、text 需 content——所以行内只渲染当前类型对应的字段，校验才落得准。
const buildContentFields = (FormInfo, Editor, formatMessage, contentType) => {
  const { Input, SuperSelect, Switch, Upload } = FormInfo.fields;
  const { TableList, List } = FormInfo;

  if (contentType === 'file') {
    return [
      <Upload name="fileId" label={formatMessage({ id: 'adminFlow.deliverable.material.fileField' })} rule="REQ" interceptor={['object-output-value', 'array-single']} maxLength={1} multiple={false} block />,
      <Input name="fileName" label={formatMessage({ id: 'adminFlow.deliverable.fileName' })} block />
    ];
  }
  if (contentType === 'url') {
    return [<Input name="url" label={formatMessage({ id: 'adminFlow.deliverable.material.urlField' })} rule="REQ URL" block />];
  }
  if (contentType === 'text') {
    return [<Editor name="content" label={formatMessage({ id: 'adminFlow.deliverable.content' })} rows={10} block isMarkdown />];
  }
  if (contentType === 'checklist') {
    return [
      <TableList
        title={formatMessage({ id: 'adminFlow.deliverable.content' })}
        name="checklist"
        addText={formatMessage({ id: 'adminFlow.deliverable.material.add' })}
        itemTitle={({ index }) => formatMessage({ id: 'adminFlow.deliverable.material.index' }, { index: index + 1 })}
        list={[
          <Input name="label" label={formatMessage({ id: 'adminFlow.deliverable.material.label' })} rule="REQ" />,
          <Switch name="checked" label={formatMessage({ id: 'common.yes' })} />,
          <Input name="remark" label={formatMessage({ id: 'adminFlow.deliverable.material.remark' })} />
        ]}
      />
    ];
  }
  // 多份材料（jsonb）：用 List 而不是 TableList——每份材料是一块可展开的卡片，
  // 才放得下 Markdown 编辑器与附件上传；表格行里塞这些控件既挤又难用。
  return [
    <List
      title={formatMessage({ id: 'adminFlow.deliverable.content' })}
      name="options"
      addText={formatMessage({ id: 'adminFlow.deliverable.material.add' })}
      maxLength={20}
      // 后端要求 options 非空：默认就有第一行，且不允许删到 0 行
      minLength={1}
      defaultLength={1}
      itemTitle={({ index }) => formatMessage({ id: 'adminFlow.deliverable.material.index' }, { index: index + 1 })}
      list={(...args) => {
        // SubList 会把当前行的 groupArgs 与表单 context 一起传进来（context 在最后），
        // 靠它拿到本行已选的 type，只渲染该类型对应的内容字段，必填校验才不会误伤其它类型。
        const context = args[args.length - 1] || {};
        const groupArgs = args.slice(0, -1);
        const group = groupArgs[0] && typeof groupArgs[0] === 'object' && 'index' in groupArgs[0] ? groupArgs[0] : groupArgs[1] || {};
        const hasFormData = !!context.formData;
        const rows = (hasFormData && context.formData.options) || [];
        const rowType = hasFormData ? selectValueOf((rows[group.index] || {}).type) || 'text' : null;
        const fields = [
          <SuperSelect name="type" label={formatMessage({ id: 'adminFlow.deliverable.material.type' })} rule="REQ" single interceptor="object-output-value" options={getMaterialTypeOptions(formatMessage)} />,
          <Input name="label" label={formatMessage({ id: 'adminFlow.deliverable.material.label' })} rule="REQ LEN-1-200" />
        ];
        if (rowType === 'url') {
          fields.push(<Input name="url" label={formatMessage({ id: 'adminFlow.deliverable.material.urlField' })} rule="REQ URL" />);
        } else if (rowType === 'file') {
          fields.push(<Upload name="fileId" label={formatMessage({ id: 'adminFlow.deliverable.material.fileField' })} rule="REQ" interceptor={['object-output-value', 'array-single']} maxLength={1} multiple={false} />);
          fields.push(<Input name="fileName" label={formatMessage({ id: 'adminFlow.deliverable.fileName' })} rule="REQ LEN-1-200" tips={formatMessage({ id: 'adminFlow.deliverable.fileNameTip' })} />);
        } else if (rowType === 'text') {
          fields.push(<Editor name="content" label={formatMessage({ id: 'adminFlow.deliverable.material.textField' })} rule="REQ LEN-1-2000" rows={6} block isMarkdown />);
        } else {
          // 兜底：拿不到行数据时三种字段全渲染（格式规则仍生效），
          // 宁可少一层必填，也不能让某个类型的材料没有可填字段。
          fields.push(<Input name="url" label={formatMessage({ id: 'adminFlow.deliverable.material.urlField' })} />);
          fields.push(<Editor name="content" label={formatMessage({ id: 'adminFlow.deliverable.material.textField' })} rows={6} block isMarkdown />);
          fields.push(<Upload name="fileId" label={formatMessage({ id: 'adminFlow.deliverable.material.fileField' })} interceptor={['object-output-value', 'array-single']} maxLength={1} multiple={false} />);
          fields.push(<Input name="fileName" label={formatMessage({ id: 'adminFlow.deliverable.fileName' })} tips={formatMessage({ id: 'adminFlow.deliverable.fileNameTip' })} />);
        }
        fields.push(<Input name="remark" label={formatMessage({ id: 'adminFlow.deliverable.material.remark' })} />);
        return fields;
      }}
    />
  ];
};

// 每行只保留与类型对应的内容字段，避免多类型字段互相覆盖。
// 注意 type 可能还是回显时的选项对象（用户没重选类型），必须先收敛成 code 再判断。
const normalizeOption = option => {
  const type = selectValueOf(option.type);
  const base = { type, label: option.label, remark: option.remark || '' };
  if (type === 'file') return Object.assign(base, { fileId: option.fileId, fileName: option.fileName || '' });
  if (type === 'url') return Object.assign(base, { url: option.url });
  return Object.assign(base, { content: option.content });
};

// 交付物清单：每份材料是一张卡片，内容（Markdown / 链接 / 附件 / 清单）直接在卡片里展示，
// 不再收进「查看内容」弹窗——评审时不需要来回点开对比。
const DeliverablesPanel = createWithRemoteLoader({
  modules: ['components-core:FormInfo', 'components-core:FormInfo@useFormModal', 'components-admin:Editor', 'components-core:Global@usePreset']
})(
  withLocale(({ remoteModules, flowId, data, stage, reload: reloadDetail }) => {
    const [FormInfo, useFormModal, Editor, usePreset] = remoteModules;
    const formModal = useFormModal();
    const { ajax, apis } = usePreset();
    const { message } = App.useApp();
    const { formatMessage } = useIntl();
    const { TextArea } = FormInfo.fields;
    // 长内容默认折叠，点「展开全部」看全文；不做卡片内滚动，避免抢占页面滚轮
    const [expandedIds, setExpandedIds] = useState([]);

    const callApi = async (apiConfig, payload, successId) => {
      const { data: resData } = await ajax(Object.assign({}, apiConfig, { data: payload }));
      if (resData.code !== 0) return false;
      message.success(formatMessage({ id: successId || 'common.saveSuccess' }));
      return true;
    };

    const refresh = (reload, reloadDetailFn) => {
      reload();
      reloadDetailFn && reloadDetailFn();
    };

    const emptyContent = () => <div className={styles.contentEmpty}>{formatMessage({ id: 'adminFlow.deliverable.contentEmpty' })}</div>;

    const markdownContent = text => (
      <div className={styles.markdownBody}>
        <MarkdownRender>{text}</MarkdownRender>
      </div>
    );

    const urlContent = url => (
      <a className={styles.contentLink} href={url} target="_blank" rel="noreferrer">
        <LinkOutlined /> {url}
      </a>
    );

    const fileContent = (fileName, fileId) => (
      <span className={styles.contentFile}>
        <PaperClipOutlined /> {fileName || fileId}
      </span>
    );

    // 清单：勾选态用绿色实心勾，未勾选用灰色空心圈，评审时能快速扫出还差哪条
    const checklistContent = rows => (
      <ul className={styles.checklist}>
        {rows.map((row, index) => (
          <li key={index} className={row.checked ? styles.checklistItemDone : styles.checklistItem}>
            <span className={styles.checklistMark}>{row.checked ? <CheckCircleFilled /> : <MinusCircleOutlined />}</span>
            <span className={styles.checklistLabel}>{row.label}</span>
            {row.remark ? <span className={styles.checklistRemark}>{row.remark}</span> : null}
          </li>
        ))}
      </ul>
    );

    // 多份材料：每份先标类型，再平铺其正文/链接/附件
    const optionsContent = rows => (
      <div className={styles.materialList}>
        {rows.map((row, index) => {
          const type = selectValueOf(row.type) || 'text';
          const typeLabel = getMaterialTypeOptions(formatMessage).find(option => option.value === type)?.label || type;
          return (
            <div key={index} className={styles.materialItem}>
              <div className={styles.materialItemHead}>
                <Tag className={styles.materialType} bordered={false} color={MATERIAL_TYPE_COLOR[type] || 'default'}>
                  {typeLabel}
                </Tag>
                <span className={styles.materialItemLabel}>{row.label}</span>
                {row.remark ? <span className={styles.materialItemRemark}>{row.remark}</span> : null}
              </div>
              <div className={styles.materialItemBody}>
                {type === 'text' ? (row.content ? markdownContent(row.content) : emptyContent()) : null}
                {type === 'url' ? (row.url ? urlContent(row.url) : emptyContent()) : null}
                {type === 'file' ? (row.fileName || row.fileId ? fileContent(row.fileName, row.fileId) : emptyContent()) : null}
              </div>
            </div>
          );
        })}
      </div>
    );

    const contentNode = item => {
      if (item.contentType === 'text') return item.content ? markdownContent(item.content) : emptyContent();
      if (item.contentType === 'url') return item.url ? urlContent(item.url) : emptyContent();
      if (item.contentType === 'file') return item.fileName || item.fileId ? fileContent(item.fileName, item.fileId) : emptyContent();
      const rows = item.contentType === 'checklist' ? item.checklist || [] : item.options || [];
      if (!rows.length) return emptyContent();
      return item.contentType === 'checklist' ? checklistContent(rows) : optionsContent(rows);
    };

    // 多份材料里，行可能建了但没填实质内容，不能只按数组长度判断
    const optionHasValue = option => {
      const type = selectValueOf(option.type);
      if (type === 'url') return !!option.url;
      if (type === 'file') return !!(option.fileId || option.fileName);
      return !!String(option.content || '').trim();
    };

    // 卡片里到底有没有东西可审：这决定主操作是「编辑」还是「审核/提交」。
    // 空卡片上直接摆审核按钮是无效操作，所以未填值一律先给编辑入口。
    const hasValue = item => {
      if (item.contentType === 'text') return !!String(item.content || '').trim();
      if (item.contentType === 'url') return !!item.url;
      if (item.contentType === 'file') return !!(item.fileName || item.fileId);
      if (item.contentType === 'checklist') return (item.checklist || []).some(row => String(row.label || '').trim());
      return (item.options || []).some(optionHasValue);
    };

    // 只有真正超长的材料才折叠；多数材料直接全文铺开，符合「不点弹窗就能看」
    // 折叠态是 max-height + overflow hidden，不生成滚动容器，
    // 鼠标滚轮始终滚动整页（之前用内滚动 + overscroll-behavior 会把滚轮锁在卡片里）
    const shouldCollapse = item => {
      if (item.contentType === 'text') return String(item.content || '').length > 1200;
      if (item.contentType === 'checklist') return (item.checklist || []).length > 10;
      if (item.contentType === 'jsonb') return (item.options || []).length > 3;
      return false;
    };

    const toggleExpand = item => setExpandedIds(prev => (prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]));

    const openEditor = (item, reload, adoptAfter) => {
      // jsonb 材料 options 里每行的 type 是后端 code，回显前还原成完整选项对象
      const materialTypeOptions = getMaterialTypeOptions(formatMessage);
      const initialData = Object.assign({}, item);
      if (Array.isArray(initialData.options)) {
        initialData.options = initialData.options.map(option => Object.assign({}, option, { type: toSelectOption(option.type, materialTypeOptions) }));
      }
      formModal({
        title: formatMessage({ id: 'adminFlow.deliverable.editTitle' }),
        size: 'small',
        formProps: {
          data: initialData,
          onSubmit: async formData => {
            const payload = { id: item.id, flowId, stage: item.stage, templateCode: item.templateCode };
            if (item.contentType === 'jsonb') payload.options = (formData.options || []).map(normalizeOption);
            else if (item.contentType === 'checklist') payload.checklist = formData.checklist || [];
            else if (item.contentType === 'file') {
              payload.fileId = formData.fileId;
              payload.fileName = formData.fileName || '';
            } else if (item.contentType === 'url') payload.url = formData.url;
            else payload.content = formData.content;

            if (!(await callApi(apis.flow.deliverableSave, payload))) return false;
            if (adoptAfter && !(await callApi(apis.flow.deliverableSubmit, { id: item.id }))) return false;
            refresh(reload, reloadDetail);
            return true;
          }
        },
        children: <FormInfo list={buildContentFields(FormInfo, Editor, formatMessage, item.contentType)} />
      });
    };

    const openRemark = ({ item, reload, titleId, apiKey, payload, needRemark, needVerify }) => {
      // 核验类材料后端强制要求填核验说明（VERIFICATION_REQUIRED），
      // 直接把必填加在组件上，不再靠提交后弹提示把用户挡回来
      const remarkRequired = needRemark || needVerify;
      formModal({
        title: formatMessage({ id: titleId }),
        size: 'small',
        formProps: {
          onSubmit: async formData => {
            const ok = await callApi(apis.flow[apiKey], Object.assign({}, payload, { reviewRemark: formData.reviewRemark || '' }));
            if (!ok) return false;
            refresh(reload, reloadDetail);
            return true;
          }
        },
        children: (
          <FormInfo
            list={[
              <TextArea
                name="reviewRemark"
                label={formatMessage({ id: needVerify ? 'adminFlow.deliverable.verifyRemark' : 'adminFlow.deliverable.reviewRemark' })}
                rule={remarkRequired ? 'REQ LEN-2-500' : 'LEN-0-500'}
                placeholder={formatMessage({ id: needVerify ? 'adminFlow.deliverable.verifyPlaceholder' : 'adminFlow.deliverable.remarkPlaceholder' })}
                tips={needVerify ? formatMessage({ id: 'adminFlow.deliverable.verifyTips' }) : undefined}
                block
              />
            ]}
          />
        )
      });
    };

    const actionsOf = (item, reload, isCurrentStage) => {
      // 历史阶段只读，且内容已在卡片内直接展示，无需任何操作入口
      if (!isCurrentStage) return [];
      const status = item.status;
      const filled = hasValue(item);
      const list = [];
      if (status === 'ai_draft') {
        list.push({ children: formatMessage({ id: 'adminFlow.deliverable.useDraft' }), onClick: async () => (await callApi(apis.flow.deliverableSubmit, { id: item.id })) && refresh(reload, reloadDetail) });
        list.push({ key: 'edit', children: formatMessage({ id: 'adminFlow.action.editAndAdopt' }), onClick: () => openEditor(item, reload, true) });
      } else if (status === 'submitted') {
        list.push({
          children: formatMessage({ id: 'adminFlow.action.reviewAccept' }),
          onClick: () =>
            item.verificationRequired
              ? openRemark({ item, reload, titleId: 'adminFlow.deliverable.reviewTitle', apiKey: 'deliverableReview', payload: { id: item.id, result: 'accept' }, needVerify: true })
              : callApi(apis.flow.deliverableReview, { id: item.id, result: 'accept' }).then(ok => ok && refresh(reload, reloadDetail))
        });
      } else if (['pending', 'rejected'].includes(status)) {
        list.push({ children: formatMessage({ id: 'adminFlow.action.submit' }), onClick: async () => (await callApi(apis.flow.deliverableSubmit, { id: item.id })) && refresh(reload, reloadDetail) });
      }

      if (!['accepted', 'waived'].includes(status)) {
        list.push({ key: 'edit', children: formatMessage({ id: 'adminFlow.action.edit' }), onClick: () => openEditor(item, reload, false) });
      }
      if (['submitted', 'ai_draft'].includes(status)) {
        list.push({
          children: formatMessage({ id: 'adminFlow.action.reviewReject' }),
          isDelete: true,
          onClick: () => openRemark({ item, reload, titleId: 'adminFlow.deliverable.rejectTitle', apiKey: 'deliverableReview', payload: { id: item.id, result: 'reject' }, needRemark: true })
        });
      }
      if (!['accepted', 'waived'].includes(status)) {
        list.push({
          children: formatMessage({ id: 'adminFlow.deliverable.notNeeded' }),
          onClick: () => openRemark({ item, reload, titleId: 'adminFlow.deliverable.waiveTitle', apiKey: 'deliverableWaive', payload: { id: item.id }, needRemark: true })
        });
      }

      // 材料还没填内容：主按钮给「编辑」，提交/审核/驳回等一律收进「更多」——
      // 空卡片上摆审核没有可审的东西；填完内容后编辑退回「更多」，审核重新浮到外面。
      if (!filled) {
        const index = list.findIndex(action => action.key === 'edit');
        if (index > 0) list.unshift(list.splice(index, 1)[0]);
      }
      return list;
    };

    const cardOf = (item, reload, isCurrentStage) => {
      const name = formatMessage({ id: templateNameId(item.templateCode), defaultMessage: item.name || item.templateCode });
      const criteria = formatMessage({ id: templateCriteriaId(item.templateCode), defaultMessage: item.acceptCriteria || '' });
      const actions = actionsOf(item, reload, isCurrentStage);
      const [primary, ...rest] = actions;
      const collapsible = shouldCollapse(item);
      const expanded = expandedIds.includes(item.id);
      return (
        <div key={item.id} className={styles.deliverableCard} data-status={item.status}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitleWrap}>
              <span className={styles.cardTitle}>{name}</span>
              {item.required ? (
                <Tag className={styles.cardFlag} bordered={false} color="error">
                  {formatMessage({ id: 'adminFlow.deliverable.required' })}
                </Tag>
              ) : null}
              <Tag className={styles.cardFlag} bordered={false} color={DELIVERABLE_STATUS_COLOR[item.status] || 'default'}>
                {formatMessage({ id: deliverableStatusMessageId(item.status), defaultMessage: item.status })}
              </Tag>
              <Tag className={styles.cardFlag} bordered={false}>
                {formatMessage({ id: producedByMessageId(item.producedBy || 'human'), defaultMessage: item.producedBy || 'human' })}
              </Tag>
            </div>
            {actions.length ? (
              <Space size={6} className={styles.cardActions}>
                <Button size="small" type="primary" onClick={primary.onClick}>
                  {primary.children}
                </Button>
                {rest.length ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: rest.map((action, index) => ({ key: String(index), label: action.children, danger: !!action.isDelete })),
                      onClick: ({ key }) => {
                        const action = rest[Number(key)];
                        action && action.onClick && action.onClick();
                      }
                    }}
                  >
                    <Button size="small" type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                ) : null}
              </Space>
            ) : null}
          </div>
          {criteria ? (
            <div className={styles.cardCriteria}>
              <span className={styles.cardCriteriaLabel}>{formatMessage({ id: 'adminFlow.deliverable.acceptCriteria' })}</span>
              {criteria}
            </div>
          ) : null}
          <div className={collapsible && !expanded ? `${styles.cardBody} ${styles.cardBodyCollapsed}` : styles.cardBody}>{contentNode(item)}</div>
          {collapsible ? (
            <Button type="link" size="small" className={styles.cardToggle} onClick={() => toggleExpand(item)}>
              {formatMessage({ id: expanded ? 'adminFlow.deliverable.collapse' : 'adminFlow.deliverable.expand' })}
            </Button>
          ) : null}
          {item.reviewRemark ? (
            <div className={styles.cardRemark}>
              <span className={styles.cardRemarkLabel}>{formatMessage({ id: 'adminFlow.deliverable.reviewRemark' })}</span>
              {item.reviewRemark}
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <Fetch
        {...Object.assign({}, apis.flow.deliverables, { params: { flowId } })}
        render={({ data: listData, reload }) => {
          const all = Array.isArray(listData) ? listData : listData?.pageData || [];
          // 阶段由详情页顶部 StateBar 控制；这里只呈现该阶段材料，非当前阶段只读
          const targetStage = stage || data?.stage;
          const isCurrentStage = targetStage === data?.stage;
          const list = all.filter(item => item.stage === targetStage);
          if (!list.length) {
            return <Empty description={formatMessage({ id: 'adminFlow.detail.noMaterials' })} />;
          }
          // 历史阶段整块降为「存档」质感（统一灰色条 / 无 hover 反馈），用质感表达只读，
          // 而不是在页面上再挂一枚「历史阶段（只读）」标签
          return (
            <div className={styles.deliverableList} data-archive={isCurrentStage ? undefined : 'true'}>
              {list.map(item => cardOf(item, reload, isCurrentStage))}
            </div>
          );
        }}
      />
    );
  })
);

export default DeliverablesPanel;
