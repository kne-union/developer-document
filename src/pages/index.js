import loadable from '@loadable/component';
import { Spin } from 'antd';

const loadableWithProps = func =>
  loadable(func, {
    fallback: <Spin style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
  });

const pages = {
  Home: loadableWithProps(() => import('./Home')),
  About: loadableWithProps(() => import('./About')),
  Account: loadableWithProps(() => import('./Account')),
  Admin: loadableWithProps(() => import('./Admin')),
  InitAdmin: loadableWithProps(() => import('./Admin').then(({ InitAdmin }) => InitAdmin)),
  Error: loadableWithProps(() => import('./Error')),
  NotFound: loadableWithProps(() => import('./NotFound'))
};

export default pages;
