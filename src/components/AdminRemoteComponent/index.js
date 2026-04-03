import AppChildrenRouter from '@kne/app-children-router';

const AdminRemoteComponent = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/remote-component`}
      list={[
        {
          index: true,
          loader: () => import('./List')
        },
        {
          path: 'detail',
          loader: () => import('./TabDetail')
        }
      ]}
    />
  );
};

export default AdminRemoteComponent;
