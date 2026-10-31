import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, Send } from "lucide-react";
import api, { errorMessage, notifyDataChanged } from "../lib/api";
import usePoll from "../lib/usePoll";
import { useMember } from "../lib/auth";
import { timeAgo } from "../lib/format";
import { Empty, PageHead, Spinner, useToast } from "../components/ui";
import "./dashboard.scss";

// No socket server: an open thread asks for messages newer than its last one
// every few seconds, the conversation list a little less often
const THREAD_POLL_MS = 3000;
const LIST_POLL_MS = 10000;

// The agency's client conversations, one per inquiry. Buyers write from
// listing pages on the marketplace; the team answers here. Owners and managers
// see every thread, agents the ones assigned to them. Replies from colleagues
// count as the agency's own.
export default function Messages() {
  const { member } = useMember();
  const [params, setParams] = useSearchParams();
  const [chats, setChats] = useState(null);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, notify] = useToast();
  const bottom = useRef(null);
  const openId = Number(params.get("chat")) || null;

  const loadChats = useCallback(
    () =>
      api
        .get("/chats")
        .then((res) => setChats(res.data))
        .catch((err) => {
          setChats((c) => c || []);
          notify(errorMessage(err, "Couldn't load your messages."), true);
        }),
    [notify]
  );

  const loadChat = useCallback(
    (id) =>
      api
        .get(`/chats/${id}`)
        .then((res) => setChat(res.data))
        .catch((err) => notify(errorMessage(err, "Couldn't open this conversation."), true)),
    [notify]
  );

  useEffect(() => {
    loadChats();
  }, [loadChats]);
  usePoll(loadChats, LIST_POLL_MS);

  // Opening a thread marks it read, so the sidebar badge goes down
  useEffect(() => {
    if (!openId) return setChat(null);
    setChat(null);
    loadChat(openId).then(() => {
      setChats((list) => list?.map((c) => (c.id === openId ? { ...c, unread: 0 } : c)));
      notifyDataChanged();
    });
  }, [openId, loadChat]);

  const append = (messages) =>
    setChat((c) => {
      if (!c || !messages.length) return c;
      const known = new Set(c.messages.map((m) => m.id));
      const fresh = messages.filter((m) => m.chatId === c.id && !known.has(m.id));
      return fresh.length ? { ...c, messages: [...c.messages, ...fresh] } : c;
    });

  usePoll(
    () => {
      if (!chat) return;
      const after = chat.messages[chat.messages.length - 1]?.id || 0;
      api
        .get(`/chats/${chat.id}/messages`, { params: { after } })
        .then((res) => {
          append(res.data);
          if (res.data.some((m) => m.fromClient)) {
            loadChats();
            notifyDataChanged();
          }
        })
        .catch(() => {});
    },
    THREAD_POLL_MS,
    Boolean(chat?.id)
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages?.length]);


  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !chat) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chats/${chat.id}/messages`, { text: body });
      append([data]);
      setText("");
      loadChats();
    } catch (err) {
      notify(errorMessage(err, "Couldn't send the message."), true);
    } finally {
      setSending(false);
    }
  };

  const open = (id) => setParams(id ? { chat: String(id) } : {}, { replace: true });
  const person = chat?.receiver;

  return (
    <div className="workspace backoffice">
      <PageHead title="Messages" subtitle="Conversations with buyers and tenants about your listings." />

      {!chats ? (
        <Spinner />
      ) : chats.length === 0 ? (
        <Empty icon={MessageCircle} title="No messages yet">
          Buyers message your agency from its listing pages. Each conversation belongs to an inquiry and stays with the agency.
        </Empty>
      ) : (
        <div className={`inbox ${openId ? "reading" : ""}`}>
          <ul className="threadList" aria-label="Conversations">
            {chats.map((c) => (
              <li key={c.id}>
                <button className={`${c.id === openId ? "active" : ""} ${c.unread > 0 ? "unread" : ""}`} onClick={() => open(c.id)}>
                  <img src={c.receiver?.avatar || "/noavatar.jpg"} alt="" />
                  <span className="threadText">
                    <strong>{c.receiver?.username || "Deleted account"}</strong>
                    {c.subject?.title && <span className="threadSubject">{c.subject.title}</span>}
                    <span>
                      {c.lastMessageMine && c.lastMessage ? "You: " : ""}
                      {c.lastMessage || "No messages yet"}
                    </span>
                  </span>
                  <span className="threadMeta">
                    <time dateTime={c.lastMessageAt}>{timeAgo(c.lastMessageAt)}</time>
                    {c.unread > 0 && (
                      <span className="unreadCount" aria-label={`${c.unread} unread`}>
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="thread" aria-label="Conversation">
            {!openId ? (
              <p className="muted pickOne">Choose a conversation.</p>
            ) : !chat ? (
              <Spinner />
            ) : (
              <>
                <header className="threadHead">
                  <button className="iconBtn backBtn" onClick={() => open(null)} aria-label="Back to conversations">
                    <ArrowLeft size={18} />
                  </button>
                  <img src={person?.avatar || "/noavatar.jpg"} alt="" />
                  <span className="threadWho">
                    <strong>{person?.username || "Deleted account"}</strong>
                    {chat.subject && (
                      <span>
                        About{" "}
                        {chat.subject.postId ? (
                          <Link to={`/listings/${chat.subject.postId}`}>{chat.subject.title}</Link>
                        ) : (
                          chat.subject.title
                        )}
                        {chat.subject.assignedTo ? ` · ${chat.subject.assignedTo.username}` : " · unassigned"}
                      </span>
                    )}
                  </span>
                </header>
                <ol className="bubbles">
                  {chat.messages.map((m) => (
                    <li key={m.id} className={m.fromClient ? "" : "mine"}>
                      {!m.fromClient && m.userId !== member.id && m.senderName && <span className="sender">{m.senderName}</span>}
                      <p>{m.text}</p>
                      <time dateTime={m.createdAt}>{timeAgo(m.createdAt)}</time>
                    </li>
                  ))}
                  <li ref={bottom} aria-hidden="true" className="end" />
                </ol>
                <form className="composer" onSubmit={send}>
                  <label htmlFor="msg" className="visually-hidden">
                    Message
                  </label>
                  <textarea
                    id="msg"
                    rows={2}
                    value={text}
                    placeholder="Write a reply"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) send(e);
                    }}
                    disabled={!person || member.agency.status !== "active"}
                  />
                  <button className="btn btn-dark btn-sm" disabled={sending || !text.trim() || !person}>
                    {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Send
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {toast}
    </div>
  );
}
