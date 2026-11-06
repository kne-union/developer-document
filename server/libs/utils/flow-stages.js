/**
 * 流程阶段与节点类型常量。
 * 注意：本文件必须放在 libs/utils 下，controllers / models / services 三个目录
 * 会被 @kne/fastify-namespace 自动扫描为插件，普通常量模块放进去会导致服务启动失败。
 */

const STAGES = [
  { code: 'requirement', order: 0, nameKey: 'adminFlow.stage.requirement', name: '需求', color: 'blue', exitCriteria: '需求说明、验收标准、评审记录与需求分解方案齐备', slaDays: 7 },
  { code: 'product_design', order: 1, nameKey: 'adminFlow.stage.productDesign', name: '产品设计', color: 'purple', exitCriteria: '原型、交互说明、设计评审记录与开发计划拆分齐备', slaDays: 7 },
  { code: 'development', order: 2, nameKey: 'adminFlow.stage.development', name: '开发', color: 'cyan', exitCriteria: '技术方案、PR 链接、自测记录齐备', slaDays: 10 },
  { code: 'testing', order: 3, nameKey: 'adminFlow.stage.testing', name: '测试', color: 'orange', exitCriteria: '测试用例、测试报告、缺陷闭环齐备', slaDays: 5 },
  { code: 'pre_release', order: 4, nameKey: 'adminFlow.stage.preRelease', name: '预发布', color: 'gold', exitCriteria: '发布单、预发环境、灰度结论与上线检查单齐备', slaDays: 3 }
];

const STAGE_CODES = STAGES.map(item => item.code);
const ORDER = STAGE_CODES.slice();

// 裂变树：4 类节点，5 个阶段码分配到节点上，testing 内嵌在 development 节点
const NODE_TYPES = ['requirement', 'product_design', 'development', 'pre_release'];
const NODE_TYPE_STAGES = {
  requirement: ['requirement'],
  product_design: ['product_design'],
  development: ['development', 'testing'],
  pre_release: ['pre_release']
};

// 阶段 → 节点类型。未裂变的单节点按线性流程逐阶段推进时，nodeType 跟随 stage 同步更新，
// 这样 complete / convergeReadiness / 派单 goal 等依赖 nodeType 的判断无需各自打补丁。
const NODE_TYPE_OF_STAGE = {
  requirement: 'requirement',
  product_design: 'product_design',
  development: 'development',
  testing: 'development',
  pre_release: 'pre_release'
};

const nodeTypeOfStage = stage => NODE_TYPE_OF_STAGE[stage] || null;

// 节点裂变时允许生成的子节点类型
const NODE_TYPE_CHILDREN = {
  requirement: 'product_design',
  product_design: 'development',
  development: 'pre_release',
  pre_release: null
};

// 派单优先级里的「越靠近上线越阻塞」因子
const STAGE_URGENCY = {
  requirement: 0,
  product_design: 100,
  development: 200,
  testing: 300,
  pre_release: 400
};

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };

const stageIndex = code => STAGE_CODES.indexOf(code);

const nextStage = code => {
  const index = stageIndex(code);
  return index < 0 ? null : STAGE_CODES[index + 1] || null;
};

const prevStage = code => {
  const index = stageIndex(code);
  return index <= 0 ? null : STAGE_CODES[index - 1] || null;
};

const stagesOfNodeType = nodeType => NODE_TYPE_STAGES[nodeType] || [];

const isStageAllowed = (nodeType, stage) => stagesOfNodeType(nodeType).includes(stage);

const assertStageAllowed = (nodeType, stage) => {
  if (!isStageAllowed(nodeType, stage)) {
    throw new Error(`节点类型 ${nodeType} 不允许阶段 ${stage}`);
  }
  return true;
};

module.exports = {
  STAGES,
  STAGE_CODES,
  ORDER,
  NODE_TYPES,
  NODE_TYPE_STAGES,
  NODE_TYPE_OF_STAGE,
  NODE_TYPE_CHILDREN,
  STAGE_URGENCY,
  PRIORITY_WEIGHT,
  nodeTypeOfStage,
  stageIndex,
  nextStage,
  prevStage,
  stagesOfNodeType,
  isStageAllowed,
  assertStageAllowed
};
