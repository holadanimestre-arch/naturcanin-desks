"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./primitives";
import { IMore, IPlus, ISearch, ISend } from "./icons";
import { createClient } from "@/lib/supabase/client";

type Channel = { id: number; name: string; description: string | null };
type Message = {
  id: number;
  channel_id: number;
  user_id: string | null;
  text: string;
  created_at: string;
  author_name?: string;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameAsYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (sameAsYesterday) return "ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function ChannelTile({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: size >= 32 ? 8 : 6,
        background: "var(--nc-yellow-soft)",
        color: "var(--nc-yellow)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size >= 32 ? 15 : 12,
        flexShrink: 0,
        border: "1px solid var(--nc-yellow)",
      }}
    >
      #
    </div>
  );
}

export function ChatClient({
  me,
  channels,
}: {
  me: { id: string; name: string };
  channels: Channel[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [activeId, setActiveId] = useState<number | null>(channels[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [authorCache, setAuthorCache] = useState<Record<string, string>>({ [me.id]: me.name });
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? null;

  // Resolve author names for user_ids we don't know yet
  async function fillAuthors(userIds: string[]) {
    const missing = userIds.filter((id) => id && !authorCache[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", missing);
    if (data) {
      setAuthorCache((prev) => {
        const next = { ...prev };
        for (const p of data as any[]) next[p.id] = p.name;
        return next;
      });
    }
  }

  // Load messages when active channel changes + subscribe to realtime
  useEffect(() => {
    if (activeId == null) return;
    let ignore = false;

    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, channel_id, user_id, text, created_at")
        .eq("channel_id", activeId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (ignore) return;
      const msgs = (data ?? []) as Message[];
      setMessages(msgs);
      await fillAuthors(msgs.map((m) => m.user_id ?? "").filter(Boolean));
    })();

    const channel = supabase
      .channel(`chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeId}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.user_id) fillAuthors([m.user_id]);
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    const body = text.trim();
    if (!body || activeId == null || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: activeId, user_id: me.id, text: body });
    setSending(false);
    if (error) {
      alert("Error al enviar: " + error.message);
      return;
    }
    setText("");
  }

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
      {/* Inbox column */}
      <div
        style={{
          width: 300,
          background: "var(--nc-surface)",
          borderRight: "1px solid var(--nc-line)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--nc-line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Chat</div>
          <div style={{ flex: 1 }} />
          <button className="nc-icon-btn" aria-label="Nuevo">
            <IPlus size={14} />
          </button>
        </div>

        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--nc-line-2)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--nc-line-2)",
              padding: "5px 9px",
              borderRadius: "var(--r-sm)",
              fontSize: 11.5,
              color: "var(--nc-mute)",
            }}
          >
            <ISearch size={12} />
            <span>Buscar</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {channels.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
              Sin canales
            </div>
          ) : (
            channels.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    display: "flex", gap: 10,
                    padding: "10px 14px",
                    background: isActive ? "var(--nc-green-soft)" : "transparent",
                    borderBottom: "1px solid var(--nc-line-2)",
                    width: "100%", textAlign: "left", alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                >
                  <ChannelTile />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--nc-ink)" }}>
                      # {c.name}
                    </div>
                    {c.description && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--nc-mute)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation pane */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "var(--nc-bg)",
        }}
      >
        {active ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--nc-line)",
                background: "var(--nc-surface)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <ChannelTile />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}># {active.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                  {active.description || "Canal"}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button className="nc-icon-btn">
                <IMore size={15} />
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--nc-mute)",
                  }}
                >
                  No hay mensajes en este canal. Sé el primero en escribir.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.user_id === me.id;
                  const name = m.user_id ? authorCache[m.user_id] ?? "Usuario" : "Sistema";
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: mine ? "flex-end" : "flex-start",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      {!mine && m.user_id && <Avatar id={m.user_id} name={name} />}
                      <div style={{ maxWidth: "72%" }}>
                        {!mine && (
                          <div
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: "var(--nc-mute)",
                              marginBottom: 2,
                              paddingLeft: 2,
                            }}
                          >
                            {name}
                          </div>
                        )}
                        <div
                          style={{
                            background: mine ? "var(--nc-green)" : "var(--nc-surface)",
                            color: mine ? "white" : "var(--nc-ink)",
                            padding: "7px 11px",
                            borderRadius: mine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                            border: mine ? "none" : "1px solid var(--nc-line-2)",
                            boxShadow: mine ? "none" : "0 1px 2px rgba(28,31,26,0.05)",
                          }}
                        >
                          <div style={{ fontSize: 12.5, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                            {m.text}
                          </div>
                          <div
                            style={{
                              fontSize: 9.5,
                              marginTop: 3,
                              textAlign: "right",
                              color: mine ? "rgba(255,255,255,0.85)" : "var(--nc-mute)",
                            }}
                          >
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div
              style={{
                borderTop: "1px solid var(--nc-line)",
                background: "var(--nc-surface)",
                padding: "10px 14px",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Escribe en #${active.name}…`}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-sm)",
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--nc-ink)",
                  background: "var(--nc-bg)",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  minHeight: 36,
                  maxHeight: 140,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="nc-btn primary"
                style={{ fontSize: 12, padding: "8px 14px", minHeight: 36 }}
              >
                <ISend size={12} />
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ margin: "auto", fontSize: 12, color: "var(--nc-mute)" }}>
            Sin canales disponibles
          </div>
        )}
      </div>
    </div>
  );
}
