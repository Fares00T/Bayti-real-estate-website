import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Home } from "lucide-react";
import Navbar from "../../components/navbar/Navbar";
import "./errorPage.scss";

export default function ErrorPage({ standalone = true }) {
  const error = useRouteError();
  const status = isRouteErrorResponse(error)
    ? error.status
    : error?.response?.status;
  const notFound = status === 404 || status === 400;

  const body = (
    <div className={standalone ? "content errorPage" : "errorPage"}>
      <span className="code">{notFound ? "404" : status || "Oops"}</span>
      <h1 className="page-title">
        {notFound ? "We couldn't find that page" : "Something went wrong"}
      </h1>
      <p className="page-subtitle">
        {notFound
          ? "The listing may have been removed or the link is incorrect."
          : "Please try again in a moment."}
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} /> Back to home
      </Link>
    </div>
  );

  // Errors inside a child route already render within the Layout (navbar included)
  if (!standalone) return body;

  return (
    <div className="layout">
      <div className="navbar-wrap">
        <Navbar />
      </div>
      {body}
    </div>
  );
}
