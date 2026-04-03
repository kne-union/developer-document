import AppChildrenRouter from '@kne/app-children-router';

const AdminNpmPackage = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/npm-package`}
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

export default AdminNpmPackage;
