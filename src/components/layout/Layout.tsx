import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  // For interview page, render children only (no header/footer)
  if (location.pathname === '/interview') {
    return <>{children}</>;
  }
  
  // Hide footer only for signup page and interview page
  const hideFooter = location.pathname.startsWith('/signup');
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;