#!/usr/bin/env node
/**
 * kne_document 本地 → 服务端同步（保留本地文件，维护 sync-registry.json）
 *
 * 用法：
 *   npm run sync:kne-document -- --sync-url http://localhost:8061/api/v1 --token <token>
 *   npm run sync:kne-document -- --file worklog/project/2026-01-01-12-00-00/title.json
 *   npm run sync:kne-document -- --force   # 换服务后全量重传
 */
const { resolveRemote, syncAll, syncOneFile } = require('./kne-document-sync-lib');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sync-url' || args[i] === '--api-url') {
      result.apiUrl = args[++i];
    } else if (args[i] === '--token') {
      result.token = args[++i];
    } else if (args[i] === '--file') {
      result.file = args[++i];
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    } else if (args[i] === '--force') {
      result.force = true;
    }
  }
  return result;
};

const main = async () => {
  const cli = parseArgs();
  const { apiUrl, token } = await resolveRemote(cli);

  if (!apiUrl || !token) {
    console.error('缺少 syncUrl 或 token。请传 --sync-url / --token，或写入 ~/.kne_document/config.json');
    process.exit(1);
  }

  if (cli.file) {
    const result = await syncOneFile({
      relativePath: cli.file.replace(/\\/g, '/'),
      apiUrl,
      token,
      dryRun: cli.dryRun
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const summary = await syncAll({
    apiUrl,
    token,
    dryRun: cli.dryRun,
    force: cli.force
  });
  console.log(`完成：同步 ${summary.synced}，跳过 ${summary.skipped}，失败 ${summary.failed}`);
  if (summary.failed > 0) {
    process.exit(1);
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
