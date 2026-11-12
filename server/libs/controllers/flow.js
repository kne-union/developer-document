const fp = require('fastify-plugin');

/**
 * 流程管理 REST 接口。
 * 人与 MCP 写同一套 services.flow.*，本层只做 schema 校验与转发，不写业务判断。
 * 唯一例外：GET /flow/confirmation/:token 与 POST /flow/confirmation/:token/answer
 * 是免 adminAuth 的「可选人工复核」通道。URL 里的短码只是「查看凭证」，
 * 提交决策必须另附经带外通道投递的 answerToken（签字凭证），或在显式开启的授权代签模式下附授权凭据。
 *
 * 产品方向：AI 自主驱动全流程，人工控制点只有后台的「撤回」（/release/undo）
 * 与「打回」（/release/reject + feedback）。确认单不再是放行的前置闸门。
 */
module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const adminAuth = [authenticate.user, authenticate.admin];
  const prefix = `${options.prefix}/flow`;
  const F = () => services.flow;

  // adminAuth 已保证是后台管理员；显式注入 isAdmin，service 层据此生成 admin_center 审计凭证，
  // MCP 侧无法伪造该标记（ctx 只带 userInfo.id / actorType）。
  const asAdminRequest = request => {
    // 不要展开 request（装饰属性多为原型 getter）；原地打标记即可
    request.isAdmin = true;
    return request;
  };
  const get = (path, schema, handler) => fastify.get(`${prefix}${path}`, { onRequest: adminAuth, schema }, async request => handler(request.query || {}, asAdminRequest(request)));
  const post = (path, schema, handler) => fastify.post(`${prefix}${path}`, { onRequest: adminAuth, schema }, async request => handler(request.body || {}, asAdminRequest(request)));

  // ---------- 阶段常量与统计 ----------
  get('/stages', { summary: '阶段常量与阶段模板数量' }, () => F().stages());
  get('/summary', { summary: '各阶段实例数与超时数' }, (query, request) => F().summary(query, request));
  get(
    '/list',
    {
      summary: '流程列表',
      query: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          stage: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          ownerUserId: { type: 'string' },
          nodeType: { type: 'string' },
          rootId: { type: 'string' },
          dueStart: { type: 'string' },
          dueEnd: { type: 'string' },
          perPage: { type: 'number', default: 20 },
          currentPage: { type: 'number', default: 1 }
        }
      }
    },
    (query, request) => F().list(query, request)
  );
  get('/detail', { summary: '流程详情', query: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }, (query, request) => F().detail(query, request));
  get('/stage-records', { summary: '阶段流转时间线', query: { type: 'object', properties: { flowId: { type: 'string' } }, required: ['flowId'] } }, (query, request) => F().stageRecords(query, request));
  get('/tree', { summary: '流程树', query: { type: 'object', properties: { rootId: { type: 'string' }, flowId: { type: 'string' } } } }, (query, request) => F().getTree(query, request));

  // ---------- 生命周期（人与 AI 共用 service） ----------
  post(
    '/create',
    {
      summary: '新建流程节点',
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          ownerUserId: { type: 'string' },
          dueAt: { type: 'string' },
          tags: { type: 'array' },
          participantIds: { type: 'array' },
          parentId: { type: 'string' },
          nodeType: { type: 'string', enum: ['requirement', 'product_design', 'development', 'pre_release'] },
          runId: { type: 'string' },
          idempotencyKey: { type: 'string' }
        }
      }
    },
    (body, request) => F().create(body, request)
  );

  post(
    '/update',
    {
      summary: '编辑基础字段（不接受 stage / status / parentId）',
      body: {
        type: 'object',
        required: ['id', 'version'],
        properties: {
          id: { type: 'string' },
          version: { type: 'number' },
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          ownerUserId: { type: 'string' },
          dueAt: { type: 'string' },
          tags: { type: 'array' },
          participantIds: { type: 'array' }
        }
      }
    },
    (body, request) => F().update(body, request)
  );

  post(
    '/archive',
    {
      summary: '作废流程（可恢复的软终态）',
      body: { type: 'object', required: ['id', 'version', 'reason'], properties: { id: { type: 'string' }, version: { type: 'number' }, reason: { type: 'string', maxLength: 500 }, cascade: { type: 'boolean' } } }
    },
    (body, request) => F().archive(body, request)
  );

  post('/delete', { summary: '硬删（仅人，不注册为 MCP 工具）', body: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } }, (body, request) => F().remove(body, request));

  post(
    '/transition',
    {
      summary: '阶段推进 / 回退 / 强制 / 完成（唯一状态机入口）',
      body: {
        type: 'object',
        required: ['id', 'version', 'action'],
        properties: {
          id: { type: 'string' },
          nodeId: { type: 'string' },
          version: { type: 'number' },
          toStage: { type: 'string', enum: ['requirement', 'product_design', 'development', 'testing', 'pre_release'] },
          action: { type: 'string', enum: ['advance', 'rollback', 'force', 'complete'] },
          remark: { type: 'string', maxLength: 500 },
          waivedCodes: { type: 'array', items: { type: 'string' } },
          confirmationId: { type: 'string' }
        }
      }
    },
    (body, request) => F().transition(body, request)
  );

  // ---------- 交付物 ----------
  get('/deliverable/templates', { summary: '交付物模板（23 项）', query: { type: 'object', properties: { stage: { type: 'string' }, nodeType: { type: 'string' } } } }, (query, request) => ({ templates: F().getTemplates(query) }));
  get('/deliverable/list', { summary: '交付物清单', query: { type: 'object', properties: { flowId: { type: 'string' }, stage: { type: 'string' } }, required: ['flowId'] } }, (query, request) => F().deliverableList(query, request));
  get(
    '/deliverable/check',
    {
      summary: '准出预检',
      query: { type: 'object', properties: { flowId: { type: 'string' }, fromStage: { type: 'string' }, action: { type: 'string' } }, required: ['flowId', 'fromStage'] }
    },
    (query, request) => F().checkExit(query, request)
  );
  post(
    '/deliverable/save',
    {
      summary: '保存交付物内容',
      body: {
        type: 'object',
        required: ['flowId', 'stage', 'templateCode'],
        properties: {
          id: { type: 'string' },
          flowId: { type: 'string' },
          stage: { type: 'string' },
          templateCode: { type: 'string' },
          fileId: { type: 'string' },
          fileName: { type: 'string' },
          url: { type: 'string' },
          content: { type: 'string' },
          checklist: { type: 'array' },
          options: { type: 'array' },
          overwrite: { type: 'boolean' },
          version: { type: 'number' },
          sourceRefs: { type: 'array' },
          confidence: { type: 'number' },
          aiRunId: { type: 'string' }
        }
      }
    },
    (body, request) => F().deliverableSave(body, request)
  );
  post('/deliverable/submit', { summary: '提交审核', body: { type: 'object', properties: { id: { type: 'string' }, ids: { type: 'array' } } } }, (body, request) => F().deliverableSubmit(body, request));
  post(
    '/deliverable/review',
    {
      summary: '审核通过 / 驳回',
      body: { type: 'object', required: ['id', 'result'], properties: { id: { type: 'string' }, result: { type: 'string', enum: ['accept', 'reject'] }, reviewRemark: { type: 'string' }, confirmationId: { type: 'string' } } }
    },
    (body, request) => F().deliverableReview(body, request)
  );
  post(
    '/deliverable/waive',
    { summary: '豁免必交项', body: { type: 'object', required: ['id', 'reviewRemark'], properties: { id: { type: 'string' }, reviewRemark: { type: 'string' }, confirmationId: { type: 'string' } } } },
    (body, request) => F().deliverableWaive(body, request)
  );

  // ---------- 裂变（AI 出稿 + 真人确认） ----------
  post(
    '/decompose/propose',
    {
      summary: 'AI 出裂变草案（不落树）',
      body: {
        type: 'object',
        required: ['nodeId', 'children', 'rationale'],
        properties: {
          nodeId: { type: 'string' },
          runId: { type: 'string' },
          children: { type: 'array' },
          rationale: { type: 'string' },
          supersedeConfirmationId: { type: 'string' },
          changeNote: { type: 'string' }
        }
      }
    },
    (body, request) => F().proposeDecomposition(body, { ...request, actorType: 'mcp-ai' })
  );
  post(
    '/decompose/apply',
    {
      summary: '按草案落树（autonomous=true 时 AI 自主）',
      body: { type: 'object', required: ['confirmationId'], additionalProperties: false, properties: { confirmationId: { type: 'string' }, autonomous: { type: 'boolean' } } }
    },
    (body, request) => F().applyDecomposition(body, request)
  );

  // ---------- 真人确认 ----------
  get(
    '/confirmation/list',
    {
      summary: '确认中心列表（兜底入口）',
      query: { type: 'object', properties: { status: { type: 'string' }, nodeId: { type: 'string' }, perPage: { type: 'number' }, currentPage: { type: 'number' } } }
    },
    (query, request) => F().confirmationList(query)
  );
  post(
    '/confirmation/answer',
    {
      summary: '后台回答确认（真人签字，不注册为 MCP 工具）',
      body: {
        type: 'object',
        required: ['id', 'decision'],
        properties: {
          id: { type: 'string' },
          decision: { type: 'string', enum: ['approve', 'reject', 'changes_requested'] },
          answers: { type: 'array' },
          comment: { type: 'string' },
          finalChildren: { type: 'array' },
          humanEdits: { type: 'object' }
        }
      }
    },
    (body, request) => F().confirmationAnswer({ ...body, surface: 'admin_center' }, request)
  );
  post(
    '/confirmation/cancel',
    {
      summary: '撤回未决策的确认请求',
      body: { type: 'object', required: ['confirmationId'], properties: { confirmationId: { type: 'string' }, reason: { type: 'string' } } }
    },
    (body, request) => F().confirmationCancel(body, request)
  );

  // ---------- 免登录一次性短链（主路径，签名即身份） ----------
  fastify.get(`${prefix}/confirmation/:token`, { schema: { summary: '会话内一次性确认页数据' } }, async request => F().confirmationGetByToken({ token: request.params.token }));
  fastify.post(
    `${prefix}/confirmation/:token/answer`,
    {
      schema: {
        summary: '短链页提交真人决策',
        body: {
          type: 'object',
          required: ['decision'],
          properties: {
            decision: { type: 'string', enum: ['approve', 'reject', 'changes_requested'] },
            answers: { type: 'array' },
            comment: { type: 'string' },
            finalChildren: { type: 'array' },
            humanEdits: { type: 'object' },
            answerToken: { type: 'string' },
            assisted: { type: 'boolean' },
            authorizationRef: { type: 'string' }
          }
        }
      }
    },
    async request => F().confirmationAnswerByToken({ token: request.params.token, ...(request.body || {}) })
  );

  // ---------- 暂停 / 恢复 ----------
  post(
    '/pause',
    {
      summary: '暂停节点 / 阶段 / 整树',
      body: { type: 'object', required: ['reason'], properties: { nodeId: { type: 'string' }, rootId: { type: 'string' }, stage: { type: 'string' }, reason: { type: 'string' }, releaseLease: { type: 'boolean' } } }
    },
    (body, request) => F().pause(body, request)
  );
  post(
    '/resume',
    {
      summary: '恢复（AI 自主恢复自己暂停的任务；人工暂停需真人恢复）',
      body: { type: 'object', properties: { nodeId: { type: 'string' }, rootId: { type: 'string' }, stage: { type: 'string' }, reason: { type: 'string' }, confirmationId: { type: 'string' } } }
    },
    (body, request) => F().resume(body, request)
  );

  // ---------- 队列与放行记录（后台可观测） ----------
  get('/queue/peek', { summary: 'AI 任务队列与排除项', query: { type: 'object', properties: { stage: { type: 'string' }, limit: { type: 'number', default: 10 } } } }, (query, request) => F().queuePeek(query, request));
  get('/release/list', { summary: '放行记录', query: { type: 'object', properties: { flowId: { type: 'string' }, perPage: { type: 'number' }, currentPage: { type: 'number' } } } }, (query, request) => F().releaseList(query, request));
  post('/release/undo', { summary: '撤回一次放行（按快照复原，不留反馈）', body: { type: 'object', required: ['releaseId', 'reason'], properties: { releaseId: { type: 'string' }, reason: { type: 'string' } } } }, (body, request) =>
    F().releaseUndo(body, request)
  );
  // 人工打回：复原 + 写意见，AI 未 ack 前 releaseCheck 会阻断同一流程的下一次放行
  post('/release/reject', { summary: '打回一次放行并附人工意见', body: { type: 'object', required: ['releaseId', 'reason'], properties: { releaseId: { type: 'string' }, reason: { type: 'string', maxLength: 1000 } } } }, (body, request) =>
    F().releaseReject(body, request)
  );
  get('/release/feedback', { summary: '人工打回意见', query: { type: 'object', properties: { flowId: { type: 'string' }, status: { type: 'string', enum: ['open', 'acknowledged'] } } } }, (query, request) =>
    F().humanFeedback(query, request)
  );
  get('/run/detail', { summary: 'AI run 详情', query: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'] } }, (query, request) => F().runDetail(query, request));
  get('/run/list', { summary: 'AI run 列表（详情页 AI 记录 Tab）', query: { type: 'object', properties: { flowId: { type: 'string' }, perPage: { type: 'number' }, currentPage: { type: 'number' } } } }, (query, request) =>
    F().runList(query, request)
  );
});
