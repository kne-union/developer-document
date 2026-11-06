import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import { Spin } from 'antd';

const pageLoading = <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />;
const List = loadable(() => import('./List'), { fallback: pageLoading });
const TabDetail = loadable(() => import('./TabDetail'), { fallback: pageLoading });

// 技能管理：受 MCP 管理的技能 / 规则统一管理面（列表 + 详情/编辑）
const AdminSkill = ({ baseUrl, menu, ...rest }) => {
  const moduleBaseUrl = `${baseUrl}/skill`;

  return (
    <Routes>
      <Route index element={<List baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
      <Route path="detail" element={<TabDetail baseUrl={moduleBaseUrl} menu={menu} {...rest} />} />
    </Routes>
  );
};

export default AdminSkill;
