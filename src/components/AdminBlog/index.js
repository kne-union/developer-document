import AppChildrenRouter from '@kne/app-children-router';

const AdminBlog = ({ baseUrl }) => {
  return (
    <AppChildrenRouter
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/blog`}
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

export default AdminBlog;
