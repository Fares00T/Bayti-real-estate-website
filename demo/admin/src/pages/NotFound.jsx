import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="emptyPage">
      <h1>Page not found</h1>
      <p className="muted">This section doesn&rsquo;t exist in the admin dashboard.</p>
      <Link to="/overview" className="btn btn-dark btn-sm">
        Back to overview
      </Link>
    </div>
  );
}
