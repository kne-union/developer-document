import AppChildrenRouter from '@kne/app-children-router';

const AdminSearchAnalytics = ({ baseUrl, menu, ...rest }) => {
  return (
    <AppChildrenRouter
      {...rest}
      menu={menu}
      errorPage
      notFoundPage
      baseUrl={`${baseUrl}/search-analytics`}
      list={[
        {
          index: true,
          loader: () => import('./Dashboard')
        }
      ]}
    />
  );
};

export default AdminSearchAnalytics;
