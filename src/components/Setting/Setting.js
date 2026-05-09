import { createWithRemoteLoader } from '@kne/remote-loader';
import Menu from './Menu';
import { Routes, Route, Navigate } from 'react-router-dom';
import Profile from './Profile';
import About from './About';
import Advanced from './Advanced';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';

const Setting = createWithRemoteLoader({
  modules: ['components-core:Layout@Page']
})(
  withLocale(({ remoteModules, baseUrl }) => {
    const [Page] = remoteModules;
    const { formatMessage } = useIntl();

    return (
      <Page title={formatMessage({ id: 'setting.pageTitle' })} menu={<Menu baseUrl={baseUrl} />}>
        <Routes>
          <Route index element={<Navigate to={`${baseUrl}/profile`} replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="advanced" element={<Advanced />} />
        </Routes>
      </Page>
    );
  })
);

export default Setting;
