import { createWithRemoteLoader } from '@kne/remote-loader';

const Account = createWithRemoteLoader({
  modules: ['components-admin:Account']
})(({ remoteModules, ...props }) => {
  const [Account] = remoteModules;

  return <Account {...props} className="login-container" />;
});

export default Account;
