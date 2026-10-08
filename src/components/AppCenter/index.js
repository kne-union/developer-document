import { useMemo, useState } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import classnames from 'classnames';
import { Empty, Input, Spin, Typography } from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { useIsMobile } from '@kne/responsive-utils';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import { hasUserToken } from '@components/Shared/auth';
import DefaultAppIcon from '@components/Shared/DefaultAppIcon';
import style from './style.module.scss';

const { Title, Paragraph, Text } = Typography;

const UNCATEGORIZED = '__uncategorized__';

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
            <button type="button" key={item.name} className={style['app']} title={item.description || item.label || item.name} onClick={() => window.open(item.pathUrl, '_blank', 'noopener')}>
              <div className={style['icon']}>
                <AppIcon item={item} Image={Image} size={isMobile ? 64 : 72} />
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
  withLocale(({ remoteModules }) => {
    const [usePreset, Page, Image] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage, locale } = useIntl();
    const isLoggedIn = useMemo(() => hasUserToken(), []);
    const [keyword, setKeyword] = useState('');
    const loadingView = (
      <div className={style['loading']}>
        <Spin />
      </div>
    );

    return (
      <Page name="app-center" noMargin>
        <div className={style['page']}>
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
              <div className={style['search']}>
                <Input allowClear size="large" prefix={<SearchOutlined />} placeholder={formatMessage({ id: 'appCenter.searchPlaceholder' })} value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
            </div>
          </section>
          <section className={style['panel']}>
            <Fetch
              {...apis.group.groupList}
              params={{ type: 'app', language: locale, output: 'list' }}
              render={({ data: groups, loading: groupsLoading }) =>
                groupsLoading ? (
                  loadingView
                ) : (
                  <Fetch
                    {...(isLoggedIn ? apis.appManager.centerList : apis.appManager.centerPublicList)}
                    render={({ data, loading }) => (loading ? loadingView : <AppPanel list={data?.pageData || []} groups={Array.isArray(groups) ? groups : []} keyword={keyword} Image={Image} />)}
                  />
                )
              }
            />
          </section>
        </div>
      </Page>
    );
  })
);

export default AppCenter;
