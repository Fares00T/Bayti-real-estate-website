import "./layout.scss";
import Navbar from "../../components/navbar/Navbar";
import Footer from "../../components/footer/Footer";
import { Navigate, Outlet, useLocation, useMatches } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function Layout() {
  const matches = useMatches();
  const { pathname, hash } = useLocation();
  // Marketing pages set handle.bleed: they lay out their own full-width bands
  const bleed = matches.some((m) => m.handle?.bleed);
  // The list page fills the viewport with its map; a footer under it is noise
  const footer = !matches.some((m) => m.handle?.noFooter);

  // New page → start at the top, unless the link targets a section
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    else document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [pathname, hash]);

  return (
    <div className="layout">
      <div className="navbar-wrap">
        <Navbar />
      </div>
      <main className={`content ${bleed ? "bleed" : ""}`}>
        <Outlet />
      </main>
      {footer && <Footer />}
    </div>
  );
}

// ✅ Ensure the user is authenticated before accessing protected routes
function RequireAuth() {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  // Come back to the page they wanted after logging in
  if (!currentUser) return <Navigate to="/login" state={{ from: location.pathname + location.search }} />;
  return <Layout />;
}

export { Layout, RequireAuth };
