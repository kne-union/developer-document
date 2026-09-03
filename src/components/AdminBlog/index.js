import { Routes, Route, Navigate } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';
import Menu from './Menu';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('./List'), { fallback: pageLoading });
const TabDetail = loadable(() => import('./TabDetail'), { fallback: pageLoading });
const Leads = loadable(() => import('./Leads'), { fallback: pageLoading });

const AdminBlog = ({ baseUrl }) => {
  const moduleBaseUrl = `${baseUrl}/blog`;
  const menu = <Menu baseUrl={moduleBaseUrl} />;

  return (
    <Routes>
      <Route index element={<Navigate to={`${moduleBaseUrl}/list`} replace />} />
      <Route path="list" element={<List baseUrl={moduleBaseUrl} menu={menu} />} />
      <Route path="detail" element={<TabDetail baseUrl={moduleBaseUrl} />} />
      <Route path="leads/*" element={<Leads baseUrl={moduleBaseUrl} menu={menu} />} />
    </Routes>
  );
};

export default AdminBlog;
