/**
 * 阶段交付物模板（23 项，代码常量不落库）。
 * 必须放在 libs/utils 下，避免被自动扫描目录当成插件加载。
 *
 * v0.3.4：取消全部 allowedProducers='human'，23 项均为 any；
 * 真实性改由 verificationRequired + evidenceRefs 可解析 + 放行台账留痕保证；
 * AI 自主放行，人工在事后撤回 / 打回，不再逐步预签字。
 * 裂变是可选能力：decomposition_plan / design_decomposition 默认非必交，
 * 不裂变的单节点不应被强制交裂变方案。
 */

const VERIFICATION_REQUIRED_CODES = ['requirement_review', 'design_review', 'test_report', 'defect_closure', 'release_ticket', 'canary_result', 'go_live_checklist', 'monitor_snapshot'];

const build = items =>
  items.map((item, index) =>
    Object.assign(
      {
        sort: index,
        required: true,
        allowMultiple: false,
        allowedProducers: 'any',
        verificationRequired: VERIFICATION_REQUIRED_CODES.includes(item.code),
        reviewerRole: null
      },
      item,
      { allowMultiple: item.contentType === 'jsonb' ? true : item.allowMultiple || false }
    )
  );

const DELIVERABLE_TEMPLATES = {
  requirement: build([
    {
      stage: 'requirement',
      code: 'requirement_doc',
      nameKey: 'adminFlow.deliverableTemplate.requirementDoc.name',
      name: '需求说明',
      contentType: 'text',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.requirementDoc.criteria',
      acceptCriteria: '背景、目标、范围、非目标写清，无歧义',
      reviewerRole: '产品负责人'
    },
    {
      stage: 'requirement',
      code: 'acceptance_criteria',
      nameKey: 'adminFlow.deliverableTemplate.acceptanceCriteria.name',
      name: '验收标准（AC）',
      contentType: 'checklist',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.acceptanceCriteria.criteria',
      acceptCriteria: '逐条可验证，含边界与异常场景',
      reviewerRole: '产品 + 测试'
    },
    {
      stage: 'requirement',
      code: 'requirement_review',
      nameKey: 'adminFlow.deliverableTemplate.requirementReview.name',
      name: '需求评审记录',
      contentType: 'jsonb',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.requirementReview.criteria',
      acceptCriteria: '可放多份材料；整体有评审结论、参与人、待办闭环',
      reviewerRole: '产品负责人'
    },
    {
      stage: 'requirement',
      code: 'background_ref',
      nameKey: 'adminFlow.deliverableTemplate.backgroundRef.name',
      name: '竞品 / 背景资料',
      contentType: 'jsonb',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.backgroundRef.criteria',
      acceptCriteria: '可放多份材料；每份注明用途且来源可访问'
    },
    {
      stage: 'requirement',
      code: 'decomposition_plan',
      nameKey: 'adminFlow.deliverableTemplate.decompositionPlan.name',
      name: '需求分解方案（裂变，可选）',
      contentType: 'jsonb',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.decompositionPlan.criteria',
      acceptCriteria: '仅主动裂变时需要；列出拟拆出的 N 个产品设计，由 AI 自主落树，人工可事后撤回 / 打回',
      reviewerRole: '产品负责人 + 技术负责人'
    }
  ]),
  product_design: build([
    {
      stage: 'product_design',
      code: 'prototype',
      nameKey: 'adminFlow.deliverableTemplate.prototype.name',
      name: '原型 / 设计稿',
      contentType: 'url',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.prototype.criteria',
      acceptCriteria: '覆盖主流程与异常态，链接可访问',
      reviewerRole: '设计负责人'
    },
    {
      stage: 'product_design',
      code: 'interaction_spec',
      nameKey: 'adminFlow.deliverableTemplate.interactionSpec.name',
      name: '交互与状态说明',
      contentType: 'text',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.interactionSpec.criteria',
      acceptCriteria: '各状态、权限、空态、加载态说明完整',
      reviewerRole: '设计 + 前端'
    },
    {
      stage: 'product_design',
      code: 'design_review',
      nameKey: 'adminFlow.deliverableTemplate.designReview.name',
      name: '设计评审记录',
      contentType: 'jsonb',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.designReview.criteria',
      acceptCriteria: '可放多份材料；评审通过结论明确',
      reviewerRole: '设计负责人'
    },
    {
      stage: 'product_design',
      code: 'options',
      nameKey: 'adminFlow.deliverableTemplate.options.name',
      name: '扩展材料',
      contentType: 'jsonb',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.options.criteria',
      acceptCriteria: '每项注明用途与类型；文件命名规范'
    },
    {
      stage: 'product_design',
      code: 'design_decomposition',
      nameKey: 'adminFlow.deliverableTemplate.designDecomposition.name',
      name: '开发计划拆分（裂变，可选）',
      contentType: 'jsonb',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.designDecomposition.criteria',
      acceptCriteria: '仅主动裂变时需要；列出拟拆出的 N 个开发计划，由 AI 自主落树，人工可事后撤回 / 打回',
      reviewerRole: '技术负责人'
    }
  ]),
  development: build([
    {
      stage: 'development',
      code: 'tech_design',
      nameKey: 'adminFlow.deliverableTemplate.techDesign.name',
      name: '技术方案 / 接口设计',
      contentType: 'text',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.techDesign.criteria',
      acceptCriteria: '含数据模型、接口、兼容与回滚考虑',
      reviewerRole: '技术负责人'
    },
    {
      stage: 'development',
      code: 'pr_link',
      nameKey: 'adminFlow.deliverableTemplate.prLink.name',
      name: '代码分支 / PR 链接',
      contentType: 'url',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.prLink.criteria',
      acceptCriteria: 'PR 可访问、已合并或可评审',
      reviewerRole: '技术负责人'
    },
    {
      stage: 'development',
      code: 'self_test',
      nameKey: 'adminFlow.deliverableTemplate.selfTest.name',
      name: '自测记录',
      contentType: 'checklist',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.selfTest.criteria',
      acceptCriteria: '覆盖 AC 全部条目，结果可复现',
      reviewerRole: '开发 + 测试'
    },
    {
      stage: 'development',
      code: 'changelog',
      nameKey: 'adminFlow.deliverableTemplate.changelog.name',
      name: '变更说明',
      contentType: 'text',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.changelog.criteria',
      acceptCriteria: '影响范围与配置项说明'
    }
  ]),
  testing: build([
    {
      stage: 'testing',
      code: 'test_cases',
      nameKey: 'adminFlow.deliverableTemplate.testCases.name',
      name: '测试用例',
      contentType: 'file',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.testCases.criteria',
      acceptCriteria: '覆盖 AC、边界、回归范围',
      reviewerRole: '测试负责人'
    },
    {
      stage: 'testing',
      code: 'test_report',
      nameKey: 'adminFlow.deliverableTemplate.testReport.name',
      name: '测试报告',
      contentType: 'file',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.testReport.criteria',
      acceptCriteria: '结论明确（通过 / 有条件通过）、环境版本齐全',
      reviewerRole: '测试负责人'
    },
    {
      stage: 'testing',
      code: 'defect_closure',
      nameKey: 'adminFlow.deliverableTemplate.defectClosure.name',
      name: '缺陷清单及闭环',
      contentType: 'url',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.defectClosure.criteria',
      acceptCriteria: '无未关闭的阻塞 / 严重缺陷',
      reviewerRole: '测试 + 产品'
    },
    {
      stage: 'testing',
      code: 'regression_note',
      nameKey: 'adminFlow.deliverableTemplate.regressionNote.name',
      name: '回归记录',
      contentType: 'text',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.regressionNote.criteria',
      acceptCriteria: '回归范围与结果'
    }
  ]),
  pre_release: build([
    {
      stage: 'pre_release',
      code: 'release_ticket',
      nameKey: 'adminFlow.deliverableTemplate.releaseTicket.name',
      name: '发布单 / 变更单',
      contentType: 'text',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.releaseTicket.criteria',
      acceptCriteria: '版本号、变更内容、发布时间窗口',
      reviewerRole: '技术负责人'
    },
    {
      stage: 'pre_release',
      code: 'staging_env',
      nameKey: 'adminFlow.deliverableTemplate.stagingEnv.name',
      name: '预发环境地址与说明',
      contentType: 'url',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.stagingEnv.criteria',
      acceptCriteria: '环境可用、账号与数据准备说明',
      reviewerRole: '运维 / 技术负责人'
    },
    {
      stage: 'pre_release',
      code: 'canary_result',
      nameKey: 'adminFlow.deliverableTemplate.canaryResult.name',
      name: '灰度验证结论',
      contentType: 'text',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.canaryResult.criteria',
      acceptCriteria: '核心链路验证通过、监控无异常',
      reviewerRole: '产品 + 测试'
    },
    {
      stage: 'pre_release',
      code: 'go_live_checklist',
      nameKey: 'adminFlow.deliverableTemplate.goLiveChecklist.name',
      name: '上线检查单 / 回滚方案',
      contentType: 'checklist',
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.goLiveChecklist.criteria',
      acceptCriteria: '含配置、开关、回滚步骤与责任人',
      reviewerRole: '技术负责人'
    },
    {
      stage: 'pre_release',
      code: 'monitor_snapshot',
      nameKey: 'adminFlow.deliverableTemplate.monitorSnapshot.name',
      name: '监控告警确认',
      contentType: 'url',
      required: false,
      acceptCriteriaKey: 'adminFlow.deliverableTemplate.monitorSnapshot.criteria',
      acceptCriteria: '灰度期间无新增告警'
    }
  ])
};

const ALL_TEMPLATES = Object.values(DELIVERABLE_TEMPLATES).flat();

const getTemplatesByStage = stage => (stage ? DELIVERABLE_TEMPLATES[stage] || [] : ALL_TEMPLATES);

const getTemplate = (stage, code) => getTemplatesByStage(stage).find(item => item.code === code) || null;

// 多份材料的元素结构校验：任一非法整单拒绝
const validateOptions = options => {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('jsonb 交付物必须提供非空的 options 数组');
  }
  if (options.length > 20) {
    throw new Error('options 最多 20 份材料');
  }
  options.forEach((item, index) => {
    if (!item || !['file', 'url', 'text'].includes(item.type)) {
      throw new Error(`options[${index}].type 必须是 file / url / text`);
    }
    if (!item.label || String(item.label).length > 200) {
      throw new Error(`options[${index}].label 必填且不超过 200 字`);
    }
    if (item.type === 'file' && (!item.fileId || !item.fileName)) {
      throw new Error(`options[${index}] 为 file 时必须有 fileId 与 fileName`);
    }
    if (item.type === 'url' && !/^https?:\/\//i.test(item.url || '')) {
      throw new Error(`options[${index}].url 必须是 http(s) 链接`);
    }
    if (item.type === 'text' && (!item.content || String(item.content).length > 2000)) {
      throw new Error(`options[${index}].content 必填且不超过 2000 字`);
    }
  });
  return true;
};

module.exports = {
  DELIVERABLE_TEMPLATES,
  ALL_TEMPLATES,
  VERIFICATION_REQUIRED_CODES,
  getTemplatesByStage,
  getTemplate,
  validateOptions
};
