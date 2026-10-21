const runner = async (fastify, options, { task, polling, updateProgress, log }) => {
  const { models, services } = fastify.project;
  const targetVersion = task.input?.version || null;

  const where = task.targetId === 'all' ? { packageName: { [fastify.sequelize.Sequelize.Op.ne]: null } } : { id: task.targetId };
  const components = await models.remoteComponent.findAll({ where });

  if (components.length === 0) {
    return {
      success: true,
      message: '没有需要部署的远程组件'
    };
  }

  const results = [];
  const total = components.length;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    updateProgress(Math.round(((i + 1) / total) * 100));

    try {
      log({ data: { remote: component.remote, packageName: component.packageName, targetVersion }, message: `正在部署 ${component.remote}` });

      const updated = await services.remoteComponent.deployComponents({ id: component.id });
      const deployed = updated || component;
      const versionReady = !targetVersion || ((deployed.versions || []).includes(targetVersion) && (!/^@kne-components\//.test(component.packageName || '') || (deployed.examples || []).includes(targetVersion)));
      if (!versionReady) {
        log({ data: { remote: component.remote, targetVersion, defaultVersion: deployed.defaultVersion }, message: `目标版本 ${targetVersion} 尚未就绪，跳过索引构建` });
        results.push({
          remote: component.remote,
          packageName: component.packageName,
          defaultVersion: deployed.defaultVersion,
          success: true,
          versionReady: false,
          indexOk: false
        });
        continue;
      }
      let indexOk = false;

      try {
        await services.documentIndex.buildFromRemoteComponent(updated || component, { version: targetVersion });
        indexOk = true;
        log({ data: { remote: component.remote, defaultVersion: updated?.defaultVersion }, message: '文档索引构建成功' });
      } catch (indexError) {
        log({ data: { error: indexError.message }, message: `文档索引构建失败: ${component.remote}` });
      }

      results.push({
        remote: component.remote,
        packageName: component.packageName,
        defaultVersion: updated?.defaultVersion,
        success: true,
        indexOk
      });

      log({ data: { remote: component.remote, indexOk }, message: '部署成功' });
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      log({ data: { error: error.message }, message: `部署 ${component.remote} 失败` });
      results.push({
        remote: component.remote,
        packageName: component.packageName,
        success: false,
        indexOk: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const indexFailCount = results.filter(r => r.success && r.versionReady !== false && r.indexOk === false).length;
  const versionNotReady = results.some(r => r.versionReady === false);
  const retry = versionNotReady ? await services.task.scheduleVersionRetry({ task }) : null;
  if (retry) {
    log({ data: retry, message: `已创建重试任务，${retry.retryDelay} 秒后执行` });
  }
  const retryMessage = retry ? `；目标版本 ${targetVersion} 未就绪，${retry.retryDelay} 秒后重试` : versionNotReady ? `；目标版本 ${targetVersion} 未就绪，已停止重试` : '';

  return {
    success: true,
    message: `部署完成：成功 ${successCount} 个，失败 ${failCount} 个，索引失败 ${indexFailCount} 个${retryMessage}`,
    total: components.length,
    successCount,
    failCount,
    indexFailCount,
    retry,
    results
  };
};

module.exports = runner;
