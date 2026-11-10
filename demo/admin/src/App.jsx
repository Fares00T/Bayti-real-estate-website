import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { useAdmin } from "./lib/auth";
import Shell from "./layout/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ListingDetail from "./pages/ListingDetail";
import ListingEditor from "./pages/ListingEditor";
import Users from "./pages/Users";
import UserCreate from "./pages/UserCreate";
import UserDetail from "./pages/UserDetail";
import Agencies from "./pages/Agencies";
import AgencyDetail from "./pages/AgencyDetail";
import Applications from "./pages/Applications";
import ApplicationDetail from "./pages/ApplicationDetail";
import Reports, { ReportDetail } from "./pages/Reports";
import { ActivityLog, Notifications } from "./pages/Activity";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Every page except sign-in requires an admin session. This only decides what
// to render — the API enforces access on every request regardless.
function RequireAdmin() {
  const { admin, checking } = useAdmin();
  if (checking) return <div className="bootSplash" aria-label="Loading" />;
  if (!admin) return <Navigate to="/login" replace />;
  return <Shell />;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <RequireAdmin />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "listings/new", element: <ListingEditor /> },
      { path: "listings/:id/edit", element: <ListingEditor /> },
      { path: "listings/:id", element: <ListingDetail /> },
      { path: "users", element: <Users /> },
      { path: "users/new", element: <UserCreate /> },
      { path: "users/:id", element: <UserDetail /> },
      { path: "agencies", element: <Agencies /> },
      { path: "agencies/:id", element: <AgencyDetail /> },
      { path: "applications", element: <Applications /> },
      { path: "applications/:id", element: <ApplicationDetail /> },
      { path: "reports", element: <Reports /> },
      { path: "reports/:id", element: <ReportDetail /> },
      { path: "notifications", element: <Notifications /> },
      { path: "activity", element: <ActivityLog /> },
      { path: "settings", element: <Settings /> },
      { path: ":section", element: <Dashboard /> },
      { path: "*", element: <NotFound /> },
    ],
  },
], {
  // Demo build: this app is served under /admin/ next to the marketplace
  basename: import.meta.env.BASE_URL.slice(0, -1) || "/",
});

export default function App() {
  return <RouterProvider router={router} />;
}
