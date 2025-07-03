import { createWithRemoteLoader } from '@kne/remote-loader';

const Admin = createWithRemoteLoader({
  modules: ['components-admin:Admin']
})(({ remoteModules, ...props }) => {
  const [Admin] = remoteModules;
  return <Admin {...props} />;
});

export default Admin;

export const InitAdmin = createWithRemoteLoader({
  modules: ['components-admin:Admin@InitAdmin']
})(({ remoteModules, ...props }) => {
  const [InitAdmin] = remoteModules;
  return <InitAdmin {...props} />;
});
