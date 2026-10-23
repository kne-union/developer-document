import { useEffect, useMemo, useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classnames from 'classnames';
import { Button, Empty, Input, Spin, Typography } from 'antd';
import { ApiOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { useIsMobile } from '@kne/responsive-utils';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import DefaultAppIcon from '@components/Shared/DefaultAppIcon';
import { useOpenApp } from '@components/Shared/AppEntry';
import { McpInstallModal, USER_MCP_TOOLS } from '@components/Shared/McpInstall';
import pwaDocument from '@kne/pwa-document';
import style from './style.module.scss';

const { Title, Paragraph, Text } = Typography;

const UNCATEGORIZED = '__uncategorized__';

const PwaSync = ({ apps }) => {
  useEffect(() => {
    pwaDocument.syncPwaDocument(apps, window.__APP_CENTER_PWA__);
  }, [apps]);
  return null;
};

const getCategoryCode = item => (typeof item.category === 'string' ? item.category : item.category?.code) || UNCATEGORIZED;

const AppIcon = ({ item, Image, size }) => {
  if (item.icon && Image?.Avatar) {
    return <Image.Avatar id={item.icon} alt={item.label || item.name} size={size} shape="square" />;
  }
  return <DefaultAppIcon />;
};

const AppPanel = ({ list, groups, keyword, Image }) => {
  const { formatMessage } = useIntl();
  const isMobile = useIsMobile();
  const openApp = useOpenApp();
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const groupOrder = groups.map(group => group.code);
    const groupNames = new Map(groups.map(group => [group.code, group.name]));
    const used = new Map();
    list.forEach(item => {
      const code = getCategoryCode(item);
      if (code !== UNCATEGORIZED && !used.has(code)) {
        used.set(code, groupNames.get(code) || item.category?.name || code);
      }
    });
    const rank = code => (groupOrder.includes(code) ? groupOrder.indexOf(code) : groupOrder.length);
    const result = [...used.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([code, name]) => ({ code, name }));
    if (list.some(item => getCategoryCode(item) === UNCATEGORIZED)) {
      result.push({ code: UNCATEGORIZED, name: formatMessage({ id: 'appCenter.uncategorized' }) });
    }
    return result;
  }, [list, groups, formatMessage]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter(item => {
      if (category !== 'all' && getCategoryCode(item) !== category) {
        return false;
      }
      if (!kw) {
        return true;
      }
      return [item.label, item.name, item.description].some(text =>
        String(text || '')
          .toLowerCase()
          .includes(kw)
      );
    });
  }, [list, keyword, category]);

  return (
    <>
      <div className={style['panel-header']}>
        <div className={style['tabs']}>
          {[{ code: 'all', name: formatMessage({ id: 'common.all' }) }, ...categories].map(({ code, name }) => (
            <button type="button" key={code} className={classnames(style['tab'], { [style['tab-active']]: category === code })} onClick={() => setCategory(code)}>
              {name}
            </button>
          ))}
        </div>
        <Text className={style['count']}>{formatMessage({ id: 'appCenter.count' }, { value: filtered.length })}</Text>
      </div>
      {filtered.length === 0 ? (
        <Empty className={style['empty']} image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: list.length ? 'appCenter.noMatch' : 'appCenter.empty' })} />
      ) : (
        <div className={style['grid']}>
          {filtered.map(item => (
            <button type="button" key={item.name} className={style['app']} title={item.description || item.label || item.name} onClick={() => openApp(item)}>
              <div className={style['icon']}>
                <AppIcon item={item} Image={Image} size={isMobile ? 52 : 72} />
              </div>
              <div className={style['label']}>{item.label || item.name}</div>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const AppCenter = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:Layout@Page', 'components-core:Image']
})(
  withLocale(({ remoteModules, tenantAppCodes }) => {
    // 租户端按租户已开通的应用展示；普通用户端只展示公开应用
    const isTenant = Array.isArray(tenantAppCodes);
    const [usePreset, Page, Image] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage, locale } = useIntl();
    const isLoggedIn = useMemo(() => hasUserToken(), []);
    const [keyword, setKeyword] = useState('');
    const [mcpOpen, setMcpOpen] = useState(false);
    const loadingView = (
      <div className={style['loading']}>
        <Spin />
      </div>
    );
    // 分组只用于页签，取不到时仍展示应用
    const renderApps = groups => (
      <Fetch
        {...(isTenant ? apis.appManager.centerList : apis.appManager.centerPublicList)}
        render={({ data, loading }) => {
          if (loading) {
            return loadingView;
          }
          const apps = (data?.pageData || []).filter(item => !isTenant || tenantAppCodes.includes(item.name));
          return (
            <>
              <PwaSync apps={apps} />
              <AppPanel list={apps} groups={groups} keyword={keyword} Image={Image} />
            </>
          );
        }}
      />
    );

    const content = (
      <div className={classnames(style['page'], { [style['embedded']]: isTenant })}>
        {!isTenant && (
          <section className={style['header']}>
            <div className={style['header-top']}>
              <div className={style['title-block']}>
                <div className={style['identity']}>
                  <span className={style['identity-icon']}>
                    <AppstoreOutlined />
                  </span>
                  <Text className={style['identity-text']}>{formatMessage({ id: 'appCenter.identityLabel' })}</Text>
                </div>
                <Title level={2} className={style['title']}>
                  {formatMessage({ id: 'app.nav.apps' })}
                </Title>
                <Paragraph className={style['description']}>{formatMessage({ id: 'appCenter.pageDescription' })}</Paragraph>
              </div>
              <div className={style['actions']}>
                <div className={style['search']}>
                  <Input allowClear size="large" prefix={<SearchOutlined />} placeholder={formatMessage({ id: 'appCenter.searchPlaceholder' })} value={keyword} onChange={e => setKeyword(e.target.value)} />
                </div>
                {isLoggedIn && (
                  <Button size="large" shape="round" icon={<ApiOutlined />} onClick={() => setMcpOpen(true)}>
                    {formatMessage({ id: 'appCenter.installMcp' })}
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}
        <McpInstallModal open={mcpOpen} onCancel={() => setMcpOpen(false)} description={formatMessage({ id: 'appCenter.installMcpDesc' })} tools={USER_MCP_TOOLS} />
        <section className={style['panel']}>
          <Fetch
            {...apis.appManager.group.groupList}
            params={{ type: 'app', language: locale, output: 'list' }}
            error={() => renderApps([])}
            render={({ data: groups, loading: groupsLoading }) => (groupsLoading ? loadingView : renderApps(Array.isArray(groups) ? groups : []))}
          />
        </section>
      </div>
    );

    if (isTenant) {
      return content;
    }

    return (
      <Page name="app-center" noMargin>
        {content}
      </Page>
    );
  })
);

export default AppCenter;
