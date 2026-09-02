import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('./List'), { fallback: pageLoading });
const Detail = loadable(() => import('./Detail'), { fallback: pageLoading });

const AdminNpmPackage = ({ baseUrl }) => {
  const moduleBaseUrl = `${baseUrl}/npm-package`;

  return (
    <Routes>
      <Route index element={<List baseUrl={moduleBaseUrl} />} />
      <Route path="detail" element={<Detail baseUrl={moduleBaseUrl} />} />
    </Routes>
  );
};

export default AdminNpmPackage;
