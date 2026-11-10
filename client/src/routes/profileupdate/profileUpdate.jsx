import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./profileupdate.scss";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "../../components/lib/apiRequest.js";
import UploadWidget from "../../components/UploadWidget/UploadWidget";

const avatarUploadConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  multiple: false,
  maxImageFileSize: 2000000,
  folder: "avatars",
};

function ProfileUpdatePage() {
  const { currentUser, updateUser } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const navigate = useNavigate();

  // the most recent upload wins
  const newAvatar = avatar[avatar.length - 1];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.target));

    if (data.password && data.password !== data.confirmPassword) {
      return setError("Passwords don't match.");
    }
    delete data.confirmPassword;
    if (!data.password) delete data.password;

    setSaving(true);
    try {
      const res = await apiRequest.put(`/users/${currentUser.id}`, {
        ...data,
        avatar: newAvatar,
      });
      updateUser(res.data);
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profileUpdatePage">
      <Link to="/profile" className="backLink">
        <ArrowLeft size={16} /> Profile
      </Link>
      <h1 className="page-title">Edit profile</h1>

      <div className="updateGrid">
        <aside className="avatarCol">
          <img src={newAvatar || currentUser.avatar || "/noavatar.jpg"} alt="" />
          <UploadWidget
            uwConfig={avatarUploadConfig}
            setState={(next) => {
              setUploadError("");
              setAvatar(next);
            }}
            onError={setUploadError}
            label={currentUser.avatar || newAvatar ? "Change photo" : "Add photo"}
          />
          {uploadError && <p className="avatarHint">{uploadError}</p>}
          {newAvatar && <p className="avatarHint">Save to keep your new photo.</p>}
        </aside>

        <form className="updateForm" onSubmit={handleSubmit}>
          <section>
            <h2>Account</h2>
            <div className="fields">
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={3}
                  defaultValue={currentUser.username}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={currentUser.email}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={currentUser.phone || ""}
                />
              </div>
            </div>
          </section>

          <section>
            <h2>Password</h2>
            <p className="sectionHint">Leave blank to keep your current password.</p>
            <div className="fields">
              <div className="field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </section>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <div className="formActions">
            <Link to="/profile" className="btn-link">
              Cancel
            </Link>
            <button className="btn btn-dark" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileUpdatePage;
