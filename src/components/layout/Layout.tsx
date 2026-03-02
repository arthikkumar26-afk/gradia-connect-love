import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import LaunchEventPopup from "@/components/LaunchEventPopup";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  // For interview page, render children only (no header/footer)
  if (location.pathname === '/interview') {
    return <>{children}</>;
  }
  
  // Hide footer for signup page and all dashboard pages
  const hideFooter = location.pathname.startsWith('/signup') ||
                     location.pathname.startsWith('/employer/dashboard') ||
                     location.pathname.startsWith('/employer/candidate') ||
                     location.pathname.startsWith('/candidate/dashboard') ||
                     location.pathname.startsWith('/admin/') ||
                     location.pathname.startsWith('/freelancer/dashboard') ||
                     location.pathname.startsWith('/owner/') ||
                     location.pathname.startsWith('/edutech/dashboard') ||
                     location.pathname === '/edit-profile';
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <LaunchEventPopup />
    </div>
  );
};

export default Layout;