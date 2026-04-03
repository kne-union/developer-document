import AppChildrenRouter from '@kne/app-children-router';

const NpmPackage = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={baseUrl}
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

export default NpmPackage;
