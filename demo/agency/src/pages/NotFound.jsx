import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="emptyPage">
      <h1>Nothing here</h1>
      <p className="muted">This page doesn&rsquo;t exist, or your role in the agency doesn&rsquo;t give access to it.</p>
      <Link to="/overview" className="btn btn-dark btn-sm">
        Back to the overview
      </Link>
    </div>
  );
}
