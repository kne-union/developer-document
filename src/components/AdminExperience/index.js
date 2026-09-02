import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('./List'), { fallback: pageLoading });
const TabDetail = loadable(() => import('./TabDetail'), { fallback: pageLoading });

const AdminExperience = ({ baseUrl, menu, ...rest }) => {
  const moduleBaseUrl = `${baseUrl}/experience`;

  return (
    <Routes>
      <Route index element={<List baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
      <Route path="detail" element={<TabDetail baseUrl={moduleBaseUrl} {...rest} />} />
    </Routes>
  );
};

export default AdminExperience;
