import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiRequest from "../../components/lib/apiRequest.js";
import { AuthContext } from "../../context/AuthContext";
import PostForm, { postToForm } from "../newPostPage/PostForm";
import "./editPost.scss";

function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest
      .get(`/posts/${id}`)
      .then((res) => {
        if (res.data.userId !== currentUser?.id) {
          setError("You can only edit your own listings.");
          return;
        }
        setInitial(postToForm(res.data));
      })
      .catch((err) =>
        setError(
          err?.response?.status === 404
            ? "This listing doesn't exist anymore."
            : "Couldn't load this listing. Please try again."
        )
      );
  }, [id, currentUser?.id]);

  const handleSubmit = async (payload) => {
    await apiRequest.put(`/posts/${id}`, payload);
    navigate(`/${id}`);
  };

  if (error) {
    return (
      <div className="editPostState">
        <div className="empty-state">
          <p>{error}</p>
          <Link to={`/${id}`} className="btn btn-outline">
            Back to listing
          </Link>
        </div>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="editPostState">
        <div className="skeleton" />
        <div className="skeleton tall" />
      </div>
    );
  }

  return (
    <PostForm
      initial={initial}
      submitLabel="Save and submit for review"
      reviewNote={
        <p className="reviewNote">
          Saving sends your changes to our team. The listing is hidden from
          visitors until they&rsquo;re approved, usually within a day.
        </p>
      }
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/${id}`)}
    />
  );
}

export default EditPost;
