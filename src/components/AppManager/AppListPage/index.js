import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('../List'), { fallback: pageLoading });
const Detail = loadable(() => import('../Detail'), { fallback: pageLoading });

/**
 * Top-level page entry (对齐未来 components-app-manager:AppListPage)
 */
const AppListPage = ({ baseUrl }) => {
  const moduleBaseUrl = `${baseUrl}/app-manager`;

  return (
    <Routes>
      <Route index element={<List baseUrl={moduleBaseUrl} />} />
      <Route path="detail" element={<Detail baseUrl={moduleBaseUrl} />} />
    </Routes>
  );
};

export default AppListPage;
