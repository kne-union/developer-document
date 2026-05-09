import { BrowserRouter } from 'react-router-dom';
import { globalInit } from './preset';
import React from 'react';
import { Result } from 'antd';
import ReactDOM from 'react-dom/client';
import App from './App';
import withLocale from './withLocale';
import { useIntl } from '@kne/react-intl';

const ErrorView = withLocale(() => {
  const { formatMessage } = useIntl();
  return <Result status="500" title={formatMessage({ id: 'bootstrap.errorTitle' })} subTitle={formatMessage({ id: 'bootstrap.errorSubTitle' })} />;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
const renderRoot = async App => {
  const globalPreset = await globalInit();
  if (globalPreset.error) {
    root.render(<ErrorView />);
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
  import('@kne/modules-dev/dist/create-entry.modern').then(module => {
    renderRoot(module.default(({ globalPreset }) => <App globalPreset={globalPreset} />));
  });
} else {
  renderRoot(App);
}
