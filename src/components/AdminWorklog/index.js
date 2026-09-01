import AppChildrenRouter from '@kne/app-children-router';

const AdminWorklog = ({ baseUrl, menu, ...rest }) => {
  return (
    <AppChildrenRouter
      {...rest}
      menu={menu}
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/worklog`}
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

export default AdminWorklog;
