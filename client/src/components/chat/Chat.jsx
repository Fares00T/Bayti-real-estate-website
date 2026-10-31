import { useContext, useEffect, useRef, useState } from "react";
import { format } from "timeago.js";
import { ArrowLeft, ArrowUp, MessageSquare, X } from "lucide-react";
import "./chat.scss";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "../lib/apiRequest";
import usePoll from "../lib/usePoll";

// How often an open thread and the inbox ask the API for news
const THREAD_POLL_MS = 3000;
const INBOX_POLL_MS = 10000;

// Lets the navbar refresh its unread badge after reading or sending
export const messagesChanged = () => window.dispatchEvent(new Event("bayti:messages"));

const displayName = (user) =>
  user ? user.agencyName || user.username : "Deleted user";
// Conversations about a property say which one
const subtitle = (chat) =>
  chat.subject?.title ? `About “${chat.subject.title}”` : chat.receiver?.kind === "agency" ? "Agency" : null;

// Who a listing's messages go to, before any conversation exists
const draftFor = (post) => ({
  id: null,
  receiver: post.agency
    ? { username: post.agency.tradeName, agencyName: post.agency.tradeName, avatar: post.agency.logo, kind: "agency" }
    : post.user && { ...post.user, kind: "owner" },
  subject: { title: post.title, postId: post.id },
  messages: [],
});

// Inbox (conversation list + thread) when given `chats`; a single thread
// about one listing when given `post` (from its page). That thread is the
// person's inquiry about the listing: it is created by the first message.
function Chat({ chats = [], post }) {
  const { currentUser } = useContext(AuthContext);
  const [list, setList] = useState(chats);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef();
  const threadOnly = Boolean(post);

  useEffect(() => setList(chats), [chats]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages?.length, chat?.id]);

  const openChat = async (id) => {
    setError("");
    try {
      const res = await apiRequest("/chats/" + id);
      setChat(res.data);
      // opening it marked it read on the server
      setList((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      messagesChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't open this conversation.");
    }
  };

  // Thread mode: the person's existing inquiry about this listing, if any
  useEffect(() => {
    if (!post || !currentUser) return;
    let cancelled = false;
    apiRequest(`/inquiries/post/${post.id}`)
      .then((res) => (res.data?.chatId ? apiRequest("/chats/" + res.data.chatId) : { data: draftFor(post) }))
      .then((res) => !cancelled && setChat(res.data))
      .catch((err) => !cancelled && setError(err.response?.data?.message || "Couldn't open the conversation."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, currentUser?.id]);

  const appendMessages = (chatId, messages) => {
    if (!messages.length) return;
    setChat((prev) => {
      if (!prev || prev.id !== chatId) return prev;
      const known = new Set(prev.messages.map((m) => m.id));
      const fresh = messages.filter((m) => !known.has(m.id));
      return fresh.length ? { ...prev, messages: [...prev.messages, ...fresh] } : prev;
    });
    const message = messages[messages.length - 1];
    // bump the conversation to the top of the list with its new preview
    setList((prev) => {
      const item = prev.find((c) => c.id === message.chatId);
      if (!item) return prev;
      return [
        {
          ...item,
          lastMessage: message.text,
          lastMessageAt: message.createdAt,
          lastMessageMine: message.userId === currentUser.id,
          unread: 0,
        },
        ...prev.filter((c) => c.id !== message.chatId),
      ];
    });
  };

  // Open thread: only ask for messages newer than the last one we have
  usePoll(
    () => {
      if (!chat) return;
      const after = chat.messages?.[chat.messages.length - 1]?.id || 0;
      apiRequest(`/chats/${chat.id}/messages`, { params: { after } })
        .then((res) => {
          appendMessages(chat.id, res.data);
          if (res.data.some((m) => m.userId !== currentUser.id)) messagesChanged();
        })
        .catch(() => {});
    },
    THREAD_POLL_MS,
    Boolean(chat?.id)
  );

  // Inbox: new conversations, previews and unread counts
  usePoll(
    () =>
      apiRequest("/chats")
        .then((res) => setList(res.data.map((c) => (c.id === chat?.id ? { ...c, unread: 0 } : c))))
        .catch(() => {}),
    INBOX_POLL_MS,
    !threadOnly
  );

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || !chat || sending) return;

    setSending(true);
    setError("");
    try {
      if (chat.id) {
        const res = await apiRequest.post("/messages/" + chat.id, { text: value });
        appendMessages(chat.id, [res.data]);
      } else {
        // first message about this listing: it opens the inquiry
        const res = await apiRequest.post("/inquiries", { postId: post.id, message: value });
        const opened = await apiRequest("/chats/" + res.data.chatId);
        setChat(opened.data);
      }
      setText("");
      messagesChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Message not sent. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const thread = chat && (
    <section className="thread">
      <header className="threadTop">
        {!threadOnly && (
          <button className="iconBtn back" onClick={() => setChat(null)} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
        )}
        <img src={chat.receiver?.avatar || "/noavatar.jpg"} alt="" />
        <div className="who">
          <strong>{displayName(chat.receiver)}</strong>
          {subtitle(chat) && <span>{subtitle(chat)}</span>}
        </div>
        {!threadOnly && (
          <button className="iconBtn close" onClick={() => setChat(null)} aria-label="Close conversation">
            <X size={18} />
          </button>
        )}
      </header>

      <div className="threadBody">
        {chat.messages?.length === 0 && (
          <p className="threadEmpty">
            Say hello to {displayName(chat.receiver)}. Ask about the listing, a visit, or the price.
          </p>
        )}
        {chat.messages?.map((message) => {
          const own = message.userId === currentUser.id;
          // an agency answers as a team: say who wrote each reply
          const sender = !own && chat.receiver?.kind === "agency" ? message.senderName : null;
          return (
            <div className={`bubbleRow ${own ? "own" : ""}`} key={message.id}>
              {sender && <span className="sender">{sender}</span>}
              <p className="bubble">{message.text}</p>
              <span className="time">{format(message.createdAt)}</span>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      {error && <p className="error-text chatError">{error}</p>}

      {chat.receiver ? (
        <form onSubmit={handleSubmit} className="composer">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message"
            aria-label="Message"
          />
          <button
            type="submit"
            className="send"
            disabled={!text.trim() || sending}
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>
      ) : (
        <p className="composerDisabled">This user is no longer on Bayti.</p>
      )}
    </section>
  );

  if (threadOnly) {
    return (
      <div className="chat chat--thread">
        {thread ||
          (error ? (
            <p className="error-text chatError">{error}</p>
          ) : (
            <p className="threadEmpty">Loading conversation…</p>
          ))}
      </div>
    );
  }

  return (
    <div className={`chat chat--inbox ${chat ? "has-thread" : ""}`}>
      <aside className="inboxList">
        <h2>Messages</h2>
        {list.length === 0 ? (
          <div className="inboxEmpty">
            <MessageSquare size={28} strokeWidth={1.5} />
            <strong>No messages yet</strong>
            <span>When you contact an owner or agency, your conversation will appear here.</span>
          </div>
        ) : (
          <ul>
            {list.map((c) => {
              const isDeleted = !c.receiver;
              return (
                <li key={c.id}>
                  <button
                    className={`conversation ${chat?.id === c.id ? "active" : ""} ${
                      c.unread > 0 ? "unread" : ""
                    }`}
                    onClick={() => openChat(c.id)}
                    disabled={isDeleted}
                  >
                    <img src={c.receiver?.avatar || "/noavatar.jpg"} alt="" />
                    <span className="meta">
                      <span className="nameRow">
                        <strong>{displayName(c.receiver)}</strong>
                        {c.lastMessageAt && <time>{format(c.lastMessageAt)}</time>}
                      </span>
                      {c.subject?.title && <span className="subject">{c.subject.title}</span>}
                      <span className="previewRow">
                        <span className="preview">
                          {c.lastMessageMine && c.lastMessage ? "You: " : ""}
                          {c.lastMessage || "No messages yet"}
                        </span>
                        {c.unread > 0 && (
                          <span className="unreadCount" aria-label={`${c.unread} unread`}>
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      {thread || (
        <div className="threadPlaceholder">
          <MessageSquare size={32} strokeWidth={1.5} />
          <p>Select a conversation to read it.</p>
        </div>
      )}
    </div>
  );
}

export default Chat;
