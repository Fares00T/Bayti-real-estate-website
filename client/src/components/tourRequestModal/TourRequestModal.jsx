import { useEffect, useState } from "react";
import { X } from "lucide-react";
import apiRequest from "../lib/apiRequest";
import { formatAddress, formatPrice } from "../lib/format";
import "./tourRequestModal.scss";

const timeSlots = [
  ["09:00", "9:00 AM"],
  ["10:00", "10:00 AM"],
  ["11:00", "11:00 AM"],
  ["14:00", "2:00 PM"],
  ["15:00", "3:00 PM"],
  ["16:00", "4:00 PM"],
  ["17:00", "5:00 PM"],
];

// Local date (not UTC) so late-evening users can still pick today
const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export default function TourRequestModal({ post, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    preferredDate: "",
    preferredTime: "",
    contactPhone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.preferredDate || !formData.preferredTime || !formData.contactPhone) {
      setError("Please fill in all required fields.");
      return;
    }
    if (formData.contactPhone.replace(/\D/g, "").length < 9) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // The API routes it from the listing: to the agency or to the owner
      await apiRequest.post("/inquiries", {
        postId: post.id,
        message: formData.message,
        visit: {
          contactPhone: formData.contactPhone,
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
        },
      });
      (onSuccess || onClose)();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to send tour request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="tour-modal-overlay" onClick={onClose}>
      <div
        className="tour-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-modal-header">
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <h3 id="tour-title">Request a tour</h3>
        </div>

        <div className="property-summary">
          {Array.isArray(post.images) && post.images[0] && (
            <img src={post.images[0]} alt="" />
          )}
          <div>
            <h4>{post.title}</h4>
            <p>{formatAddress(post)}</p>
            <p className="price">{formatPrice(post.price, post.type)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="tour-form">
          {error && <div className="error-message">{error}</div>}

          <div className="row">
            <div className="field">
              <label htmlFor="preferredDate">Date</label>
              <input
                id="preferredDate"
                name="preferredDate"
                type="date"
                min={todayLocal()}
                value={formData.preferredDate}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="preferredTime">Time</label>
              <select
                id="preferredTime"
                name="preferredTime"
                value={formData.preferredTime}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a time</option>
                {timeSlots.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="contactPhone">Phone number</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="0555 12 34 56"
              value={formData.contactPhone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="message">
              Message <span className="optional">(optional)</span>
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Anything the agency should know before your visit?"
              rows="3"
              value={formData.message}
              onChange={handleInputChange}
            />
          </div>

          <p className="hint">The agency will confirm or suggest another time.</p>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn submit-btn" disabled={loading}>
              {loading ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
