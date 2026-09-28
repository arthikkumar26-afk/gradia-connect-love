import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ExistingSessionBanner from "@/components/auth/ExistingSessionBanner";


interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  if (location.pathname === '/interview') {
    return <>{children}</>;
  }

  const hideFooter = location.pathname.startsWith('/signup') ||
                     location.pathname.startsWith('/employer/dashboard') ||
                     location.pathname.startsWith('/employer/candidate') ||
                     location.pathname.startsWith('/candidate/dashboard') ||
                     location.pathname.startsWith('/admin/') ||
                     location.pathname.startsWith('/freelancer/dashboard') ||
                     location.pathname.startsWith('/owner/') ||
                     location.pathname.startsWith('/edutech/dashboard') ||
                     location.pathname === '/edit-profile';

  const hideHeader = (location.pathname.startsWith('/admin/') && location.pathname !== '/admin/login') ||
                     (location.pathname.startsWith('/owner/') && location.pathname !== '/owner/login');

  const isLoginPage = /(^|\/)(login|hr-login)$/i.test(location.pathname) || location.pathname.endsWith('/login');

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeader && <Header />}
      <main className="flex-1">
        {isLoginPage && <ExistingSessionBanner key={location.pathname} />}
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;