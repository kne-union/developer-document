import AppChildrenRouter from '@kne/app-children-router';

const AdminExperience = ({ baseUrl, menu, ...rest }) => {
  return (
    <AppChildrenRouter
      {...rest}
      menu={menu}
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/experience`}
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

export default AdminExperience;
