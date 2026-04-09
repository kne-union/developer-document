import AppChildrenRouter from '@kne/app-children-router';

const AdminDocument = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/document`}
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

export default AdminDocument;
