import { Suspense, useContext, useState } from "react";
import {
  Await,
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router-dom";
import { Archive, ArchiveRestore, Check, Plus, Trash2 } from "lucide-react";
import Chat from "../../components/chat/Chat";
import Card from "../../components/card/Card";
import List from "../../components/list/List";
import UserInquiries from "../../components/userTourRequests/UserTourRequests";
import AgencyInvitations from "../../components/agencyInvitations/AgencyInvitations";
import apiRequest from "../../components/lib/apiRequest";
import { AuthContext } from "../../context/AuthContext";
import "./profile.scss";
import { atLimit, listingsChanged, useListingUsage } from "../../components/lib/listingUsage";
import { LimitReached, UsageMeter } from "../../components/listingLimit/ListingLimit";



const Loading = () => <div className="skeleton" aria-label="Loading" />;
const LoadError = ({ what }) => (
  <div className="empty-state">Couldn&rsquo;t load {what}. Refresh to try again.</div>
);

function Profile() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateUser, currentUser } = useContext(AuthContext);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(null);
  const usage = useListingUsage();

  if (!currentUser) return null;

  const tabs = [
    { id: "listings", label: "My properties" },
    { id: "saved", label: "Favorites" },
    { id: "messages", label: "Messages" },
    { id: "inquiries", label: "Inquiries" },
  ];
  // older links used ?tab=tours
  const requested = searchParams.get("tab") === "tours" ? "inquiries" : searchParams.get("tab");
  const tab = tabs.some((t) => t.id === requested) ? requested : "listings";

  const handleDelete = async () => {
    const id = pendingDelete;
    setPendingDelete(null);
    try {
      await apiRequest.delete(`/posts/${id}`);
      revalidator.revalidate();
      listingsChanged();
      setNotice("Listing deleted.");
    } catch (err) {
      setNotice(err.response?.data?.message || "Couldn't delete the listing.");
    }
  };

  // Archiving frees a slot; restoring takes one back (the server checks)
  const setArchived = async (post, archived) => {
    setBusy(post.id);
    try {
      await apiRequest.put(`/posts/${post.id}/archive`, { archived });
      revalidator.revalidate();
      listingsChanged();
      setNotice(archived ? "Listing archived. It no longer counts toward your limit." : "Listing restored and sent for review.");
    } catch (err) {
      setNotice(err.response?.data?.message || "Couldn't update the listing.");
    } finally {
      setBusy(null);
    }
  };

  const listingActions = (p) => (
    <>
      {["pending", "approved", "rejected"].includes(p.status) && (
        <button type="button" disabled={busy === p.id} onClick={() => setArchived(p, true)}>
          <Archive size={14} /> Archive
        </button>
      )}
      {p.status === "archived" && (
        <button type="button" disabled={busy === p.id} onClick={() => setArchived(p, false)}>
          <ArchiveRestore size={14} /> Restore
        </button>
      )}
      <button type="button" className="danger" onClick={() => setPendingDelete(p.id)}>
        <Trash2 size={14} /> Delete
      </button>
    </>
  );

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout");
    } catch (err) {
      console.log(err);
    } finally {
      // clear the local session even if the server call failed
      updateUser(null);
      navigate("/");
    }
  };

  return (
    <div className="profilePage">
      <aside className="profileAside">
        <div className="idCard">
          <div className="idMain">
            <img src={currentUser.avatar || "/noavatar.jpg"} alt="" />
            <h2>{currentUser.username}</h2>
            <span>Member</span>
          </div>
        </div>

        <div className="confirmed">
          <h3>{currentUser.username}&rsquo;s confirmed information</h3>
          <ul>
            <li>
              <Check size={18} /> Email address
            </li>
            {currentUser.phone && (
              <li>
                <Check size={18} /> Phone number
              </li>
            )}
          </ul>
        </div>

        <div className="asideActions">
          <Link to="/profile/update" className="btn btn-outline">
            Edit profile
          </Link>
          <button className="btn-link" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="profileMain">
        <header className="profileHeader">
          <div>
            <h1 className="page-title">Hi, I&rsquo;m {currentUser.username}</h1>
            <p className="page-subtitle">{currentUser.email}</p>
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button className="btn-link" onClick={() => setNotice("")}>
              Dismiss
            </button>
          </div>
        )}

        <AgencyInvitations />

        <nav className="tabs" aria-label="Profile sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setSearchParams({ tab: t.id }, { replace: true })}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "listings" && (
          <section className="tabPanel">
            <div className="panelHead">
              <div>
                <h2>My properties</h2>
                <UsageMeter usage={usage} />
              </div>
              {!atLimit(usage) && (
                <Link to="/add" className="btn btn-dark btn-sm">
                  <Plus size={16} /> Publish property
                </Link>
              )}
            </div>
            {atLimit(usage) && <LimitReached usage={usage} compact />}
            <Suspense fallback={<Loading />}>
              <Await resolve={data.postResponse} errorElement={<LoadError what="your properties" />}>
                {(postResponse) => {
                  const posts = postResponse?.data?.userPosts || [];
                  return posts.length === 0 ? (
                    <div className="empty-state">You haven't published any properties yet.</div>
                  ) : (
                    <div className="list">
                      {posts.map((p) => (
                        <Card key={p.id} item={p} actions={listingActions(p)} />
                      ))}
                    </div>
                  );
                }}
              </Await>
            </Suspense>
          </section>
        )}

        {tab === "saved" && (
          <section className="tabPanel">
            <div className="panelHead">
              <h2>Favorites</h2>
            </div>
            <Suspense fallback={<Loading />}>
              <Await resolve={data.postResponse} errorElement={<LoadError what="saved listings" />}>
                {(postResponse) => (
                  <List
                    posts={postResponse?.data?.savedPosts || []}
                    emptyText="Tap the heart on any listing to save it here."
                  />
                )}
              </Await>
            </Suspense>
          </section>
        )}

        {tab === "messages" && (
          <section className="tabPanel">
            <Suspense fallback={<Loading />}>
              <Await resolve={data.chatResponse} errorElement={<LoadError what="your messages" />}>
                {(chatResponse) => <Chat chats={chatResponse.data} />}
              </Await>
            </Suspense>
          </section>
        )}

        {tab === "inquiries" && (
          <section className="tabPanel">
            <UserInquiries />
          </section>
        )}

      </div>

      {pendingDelete && (
        <div className="confirmOverlay" onClick={() => setPendingDelete(null)}>
          <div
            className="confirmBox"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Delete this listing?</h2>
            <p>This permanently removes the listing. This can&rsquo;t be undone.</p>
            <div className="confirmButtons">
              <button className="btn-link" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-dark" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
