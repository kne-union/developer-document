import { useMemo } from 'react';
import { createWithRemoteLoader } from '@kne/remote-loader';
import { useSearchParams } from 'react-router-dom';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import List from './List';
import Settings from './Settings';

const Leads = createWithRemoteLoader({
  modules: ['components-core:Layout@StateBarPage']
})(
  withLocale(({ remoteModules, baseUrl, menu }) => {
    const [StateBarPage] = remoteModules;
    const { formatMessage } = useIntl();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeKey = searchParams.get('tab') || 'list';
    const page = useMemo(() => (menu ? { menu } : undefined), [menu]);

    const content = useMemo(() => {
      if (activeKey === 'settings') {
        return <Settings />;
      }
      return <List menu={menu} />;
    }, [activeKey, menu]);

    return (
      <StateBarPage
        page={page}
        menu={menu}
        title={formatMessage({ id: 'adminBlog.leads.pageTitle' })}
        headerFixed={false}
        stateBar={{
          activeKey,
          onChange: key => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', key);
            setSearchParams(next, { replace: true });
          },
          stateOption: [
            { tab: formatMessage({ id: 'adminBlog.leads.tabList' }), key: 'list' },
            { tab: formatMessage({ id: 'adminBlog.leads.tabSettings' }), key: 'settings' }
          ]
        }}
      >
        {content}
      </StateBarPage>
    );
  })
);

export default Leads;
