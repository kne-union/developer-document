import { createWithRemoteLoader } from '@kne/remote-loader';
import AboutPage from '@components/About';

const About = createWithRemoteLoader({
  modules: ['Layout@Page']
})(({ remoteModules }) => {
  const [Page] = remoteModules;
  return (
    <Page noMargin>
      <AboutPage />
    </Page>
  );
});

export default About;
