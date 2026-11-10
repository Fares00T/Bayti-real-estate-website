import { useEffect, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useMember } from "../lib/auth";
import { Empty, PageHead, Spinner } from "../components/ui";
import Feed from "../components/Feed";
import "./dashboard.scss";

export default function Activity() {
  const { can } = useMember();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/activity")
      .then((res) => setItems(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load the activity.")));
  }, []);

  return (
    <div className="workspace backoffice">
      <PageHead
        title="Activity"
        subtitle={
          can("activity.agency")
            ? "What your team did, and the Bayti team's decisions on your listings."
            : "What you did, and the Bayti team's decisions on your listings."
        }
      />
      <div className="panel">
        {error && <p className="error-text">{error}</p>}
        {!items && !error && <Spinner />}
        {items?.length === 0 && <Empty icon={ActivityIcon} title="Nothing yet" />}
        {items?.length > 0 && <Feed items={items} />}
      </div>
    </div>
  );
}
