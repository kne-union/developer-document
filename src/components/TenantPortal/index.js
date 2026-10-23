import AppChildrenRouter from '@kne/app-children-router';
import { createWithRemoteLoader } from '@kne/remote-loader';
import Fetch from '@kne/react-fetch';
import { Page } from '@kne/system-layout';
import { useIntl } from '@kne/react-intl';
import withLocale from '@root/withLocale';
import AppCenter from '@components/AppCenter';
import Layout from './Layout';

const Home = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset']
})(
  withLocale(({ remoteModules }) => {
    const [usePreset] = remoteModules;
    const { apis } = usePreset();
    const { formatMessage } = useIntl();
    return (
      <Page title={formatMessage({ id: 'app.nav.apps' })}>
        <Fetch {...apis.tenantApps.list} render={({ data }) => <AppCenter tenantAppCodes={(data || []).map(item => item.code)} />} />
      </Page>
    );
  })
);

const TenantPortal = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
      element={<Layout baseUrl={baseUrl} />}
      list={[
        {
          index: true,
          element: <Home />
        }
      ]}
    />
  );
};

export default TenantPortal;
