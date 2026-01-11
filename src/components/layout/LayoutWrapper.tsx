import { Outlet } from "react-router-dom";
import Layout from "./Layout";

const LayoutWrapper = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default LayoutWrapper;
