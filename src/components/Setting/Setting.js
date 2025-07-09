import { createWithRemoteLoader } from '@kne/remote-loader';
import Menu from './Menu';
import { Routes, Route, Navigate } from 'react-router-dom';
import Profile from './Profile';
import About from './About';

const Setting = createWithRemoteLoader({
  modules: ['components-core:Layout@Page']
})(({ remoteModules, baseUrl }) => {
  const [Page] = remoteModules;

  return (
    <Page title="设置" menu={<Menu baseUrl={baseUrl} />}>
      <Routes>
        <Route index element={<Navigate to={`${baseUrl}/profile`} replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="about" element={<About />} />
      </Routes>
    </Page>
  );
});

export default Setting;
