import { BrowserRouter } from 'react-router-dom';
import { globalInit } from './preset';
import React from 'react';
import { Result } from 'antd';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
const renderRoot = async App => {
  const globalPreset = await globalInit();
  if (globalPreset.error) {
    root.render(<Result status="500" title="设置载入错误" subTitle="设置载入错误，请联系网站管理员" />);
    return;
  }
  root.render(
    <BrowserRouter>
      <App themeToken={globalPreset.themeToken} globalPreset={globalPreset} />
    </BrowserRouter>
  );
};

if (process.env.NODE_ENV === 'development') {
  import('@kne/modules-dev/dist/create-entry.css');
  import('@kne/modules-dev/dist/create-entry').then(module => {
    renderRoot(module.default(({ globalPreset }) => <App globalPreset={globalPreset} />));
  });
} else {
  renderRoot(App);
}
