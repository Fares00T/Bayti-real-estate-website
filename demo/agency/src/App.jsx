import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { useMember } from "./lib/auth";
import Shell from "./layout/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Application from "./pages/Application";
import Overview from "./pages/Overview";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import ListingEditor from "./pages/ListingEditor";
import Team from "./pages/Team";
import TeamMember from "./pages/TeamMember";
import Inquiries from "./pages/Inquiries";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Every page except sign-in needs an agency session. This only decides what
// to render: the API checks membership, role and agency on every request.
// An agency account still in review only ever gets its application page.
function RequireMember() {
  const { member, checking } = useMember();
  if (checking) return <div className="bootSplash" aria-label="Loading" />;
  if (!member) return <Navigate to="/login" replace />;
  if (member.applicant) return <Navigate to="/application" replace />;
  return <Shell />;
}

function RequireApplicant() {
  const { member, checking } = useMember();
  if (checking) return <div className="bootSplash" aria-label="Loading" />;
  if (!member) return <Navigate to="/login" replace />;
  if (!member.applicant) return <Navigate to="/overview" replace />;
  return <Application />;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/application", element: <RequireApplicant /> },
  {
    path: "/",
    element: <RequireMember />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <Overview /> },
      { path: "listings", element: <Listings /> },
      { path: "listings/new", element: <ListingEditor /> },
      { path: "listings/:id", element: <ListingDetail /> },
      { path: "listings/:id/edit", element: <ListingEditor /> },
      { path: "inquiries", element: <Inquiries /> },
      { path: "messages", element: <Messages /> },
      { path: "analytics", element: <Analytics /> },
      { path: "team", element: <Team /> },
      { path: "team/:id", element: <TeamMember /> },
      { path: "activity", element: <Activity /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
], {
  // Demo build: this app is served under /agency/ next to the marketplace
  basename: import.meta.env.BASE_URL.slice(0, -1) || "/",
});

export default function App() {
  return <RouterProvider router={router} />;
}
