import AppChildrenRouter from '@kne/app-children-router';

const RemoteComponent = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/components`}
      list={[
        {
          index: true,
          loader: () => import('./List')
        },
        {
          path: 'detail',
          loader: () => import('./Detail')
        }
      ]}
    />
  );
};

export default RemoteComponent;
