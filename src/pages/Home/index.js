import { createWithRemoteLoader } from '@kne/remote-loader';
import HomePage from '@components/HomePage';

const Home = createWithRemoteLoader({
  modules: ['Layout@Page']
})(({ remoteModules }) => {
  const [Page] = remoteModules;
  return (
    <Page noMargin>
      <HomePage />
    </Page>
  );
});

export default Home;
