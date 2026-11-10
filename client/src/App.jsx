import Home from "./routes/homePage/Home";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ListPage from "./routes/listPage/ListPage";
import { Layout, RequireAuth } from "./routes/layout/Layout";
import ListDetails from "./routes/listDetails/ListDetails";
import Profile from "./routes/profile/Profile";
import Login from "./routes/login/login";
import Register from "./routes/register/register";
import NewPostPage from "./routes/newPostPage/newPostPage";
import ProfileUpdatePage from "./routes/profileupdate/profileUpdate";
import {
  listPageLoader,
  profilePageLoader,
  singlePageLoader,
} from "./components/lib/loaders";
import EditPost from "./routes/editpost/EditPost";
import AgenciesPage from "./routes/agenciesPage/agencies";
import ReportPage from "./routes/report/report";
import AgencyProfile from "./routes/agencyProfile/AgencyProfile";
import ErrorPage from "./routes/errorPage/ErrorPage";
import Notifications from "./routes/notifications/Notifications";
import ResetPassword from "./routes/resetPassword/ResetPassword";
import SellPage from "./routes/sellPage/SellPage";
import InfoPage from "./routes/infoPages/InfoPage";
import { useEffect } from "react";
import { AGENCY_URL } from "./components/lib/agencyApp";

// Agencies manage their business on the separate agency platform; old
// bookmarks and notification links to the in-marketplace dashboard land there
function AgencyPlatformRedirect({ path = "" }) {
  useEffect(() => window.location.replace(AGENCY_URL + path), [path]);
  return null;
}

// Created once at module level: rebuilding the router on every render
// (e.g. when the user logs in) would remount every page and drop its state.
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home />, handle: { bleed: true } },
      { path: "/agencies", element: <AgenciesPage />, handle: { bleed: true } },
      { path: "/agencies/:id", element: <AgencyProfile /> },
      { path: "/agency-dashboard", element: <AgencyPlatformRedirect /> },
      { path: "/sell", element: <SellPage />, handle: { bleed: true } },
      { path: "/about", element: <InfoPage page="about" /> },
      { path: "/help", element: <InfoPage page="help" /> },
      { path: "/terms", element: <InfoPage page="terms" /> },
      { path: "/privacy", element: <InfoPage page="privacy" /> },
      // Public: agencies without an account create one as the form's first step
      // agencies register on the agency platform, with an agency account
      { path: "/agency", element: <AgencyPlatformRedirect path="/register" /> },
      { path: "/report", element: <ReportPage /> },
      { path: "/list", element: <ListPage />, loader: listPageLoader, handle: { noFooter: true } },
      {
        path: "/:id",
        element: <ListDetails />,
        loader: singlePageLoader,
        errorElement: <ErrorPage standalone={false} />,
      },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ResetPassword /> },
      { path: "/reset-password/:token", element: <ResetPassword /> },
    ],
  },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/profile", element: <Profile />, loader: profilePageLoader },
      { path: "/profile/update", element: <ProfileUpdatePage /> },
      { path: "/add", element: <NewPostPage /> },
      { path: "/edit-post/:id", element: <EditPost /> },
      { path: "/notifications", element: <Notifications /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
