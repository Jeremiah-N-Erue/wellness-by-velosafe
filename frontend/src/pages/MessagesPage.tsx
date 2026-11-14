import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Conversation, Message } from "../lib/types";

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("open"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    api<Conversation[]>("/messages/conversations").then((convos) => {
      setConversations(convos);
      if (!activeId && convos[0]) setActiveId((convos[0] as any).id);
    });
  }, []);

  useEffect(() => {
    if (activeId) {
      api<Message[]>(`/messages/conversations/${activeId}`).then(setMessages);
    }
  }, [activeId]);

  const activeConvo = conversations.find((c: any) => c.id === activeId);

  async function send() {
    if (!activeId || !draft.trim()) return;
    const msg = await api<Message>(`/messages/conversations/${activeId}/messages`, {
      method: "POST",
      body: { body: draft },
    });
    setMessages((prev) => [...prev, msg]);
    setDraft("");
  }

  return (
    <div className="container">
      <h1 className="page-title">Messages</h1>
      <div className="two-col">
        <div className="card">
          {activeConvo ? (
            <>
              <strong>
                {user?.role === "CLIENT" ? (activeConvo as any).provider.user.name : (activeConvo as any).client.name}
              </strong>
              <div className="muted" style={{ marginBottom: "0.75rem" }}>
                {(activeConvo as any).stage === "PRE_BOOKING"
                  ? "Pre-booking — contact details are hidden until you have a confirmed booking."
                  : "Post-booking — fuller messaging unlocked."}
              </div>
              <div className="chat-thread">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.senderId === user?.id ? "mine" : "theirs"}`}>
                    {m.filteredBody}
                    {m.wasFiltered && <span className="filtered-note">Some contact info was hidden</span>}
                  </div>
                ))}
                {messages.length === 0 && <p className="empty-state">Say hello.</p>}
              </div>
              <div className="inline-form" style={{ marginTop: "0.75rem" }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn btn-primary" onClick={send}>Send</button>
              </div>
            </>
          ) : (
            <p className="empty-state">No conversation selected. Start one from a provider's profile.</p>
          )}
        </div>

        <div className="card">
          <strong style={{ display: "block", marginBottom: "0.5rem" }}>Conversations</strong>
          {conversations.map((c: any) => (
            <div
              key={c.id}
              className="message-row"
              style={{ cursor: "pointer", fontWeight: c.id === activeId ? 700 : 400 }}
              onClick={() => setActiveId(c.id)}
            >
              {user?.role === "CLIENT" ? c.provider.user.name : c.client.name}
              <div className="muted" style={{ fontSize: "0.78rem" }}>
                {c.messages[0]?.filteredBody?.slice(0, 40) || "No messages yet"}
              </div>
            </div>
          ))}
          {conversations.length === 0 && <p className="empty-state">No conversations yet.</p>}
        </div>
      </div>
    </div>
  );
}
