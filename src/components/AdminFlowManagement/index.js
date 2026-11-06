import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('./List'), { fallback: pageLoading });
const TabDetail = loadable(() => import('./TabDetail'), { fallback: pageLoading });
const Queue = loadable(() => import('./Queue'), { fallback: pageLoading });
const Confirmation = loadable(() => import('./Confirmation'), { fallback: pageLoading });

// 流程管理模块：列表 / 详情 / AI 任务队列 / 确认中心（兜底）
const AdminFlowManagement = ({ baseUrl, menu, ...rest }) => {
  const moduleBaseUrl = `${baseUrl}/flow`;

  return (
    <Routes>
      <Route index element={<List baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
      <Route path="detail/:id" element={<TabDetail baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
      <Route path="queue" element={<Queue baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
      <Route path="confirmation" element={<Confirmation baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
    </Routes>
  );
};

export default AdminFlowManagement;
