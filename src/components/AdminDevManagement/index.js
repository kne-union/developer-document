import { Routes, Route, Navigate } from 'react-router-dom';
import Menu from './Menu';
import InstallGuide from './InstallGuide';
import AdminExperience from '@components/AdminExperience';
import AdminWorklog from '@components/AdminWorklog';
import AdminSearchAnalytics from '@components/AdminSearchAnalytics';

const AdminDevManagement = ({ baseUrl }) => {
  const moduleBaseUrl = `${baseUrl}/dev-management`;
  const menu = <Menu baseUrl={moduleBaseUrl} />;

  return (
    <Routes>
      <Route index element={<Navigate to={`${moduleBaseUrl}/install`} replace />} />
      <Route path="install" element={<InstallGuide baseUrl={moduleBaseUrl} menu={menu} />} />
      <Route path="experience/*" element={<AdminExperience baseUrl={moduleBaseUrl} menu={menu} />} />
      <Route path="worklog/*" element={<AdminWorklog baseUrl={moduleBaseUrl} menu={menu} />} />
      <Route path="search-analytics/*" element={<AdminSearchAnalytics baseUrl={moduleBaseUrl} menu={menu} />} />
    </Routes>
  );
};

export default AdminDevManagement;
