import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiRequest from "../../components/lib/apiRequest.js";
import { atLimit, listingsChanged, useListingUsage } from "../../components/lib/listingUsage";
import { LimitReached, UsageMeter } from "../../components/listingLimit/ListingLimit";
import PostForm from "./PostForm";

function NewPostPage() {
  const navigate = useNavigate();
  const usage = useListingUsage();
  // Set when the server refuses because the last slot was just taken
  const [refused, setRefused] = useState(null);

  const handleSubmit = async (payload) => {
    try {
      const res = await apiRequest.post("/posts", payload);
      listingsChanged();
      navigate("/" + res.data.id);
    } catch (err) {
      if (err.response?.data?.code === "LISTING_LIMIT") {
        setRefused(err.response.data);
        return;
      }
      throw err;
    }
  };

  // Wait for the usage before showing a form the server might refuse
  if (!usage) return <div className="skeleton" aria-label="Loading" />;
  if (refused || atLimit(usage)) return <LimitReached usage={refused || usage} />;

  return (
    <PostForm
      submitLabel="Submit for review"
      reviewNote={
        <div className="reviewNote">
          <p>
            Our team checks every listing before it goes live, usually within a
            day. You can follow its status in My properties.
          </p>
          <UsageMeter usage={usage} />
        </div>
      }
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
    />
  );
}

export default NewPostPage;
