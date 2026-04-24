"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./primitives";
import { IMore, IPlus, ISearch, ISend, IX, ICheck } from "./icons";
import { createClient } from "@/lib/supabase/client";

type MemberLite = { id: string; name: string };

type Channel = {
  id: number;
  name: string;
  description: string | null;
  is_dm: boolean;
  members: MemberLite[];
  dm_other?: MemberLite;
  lastMsg?: { text: string; created_at: string; user_id: string | null };
};

type TeamPick = { id: string; name: string; department: string | null };

type Message = {
  id: number;
  channel_id: number;
  user_id: string | null;
  text: string;
  created_at: string;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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

function dmKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function ChatClient({
  me,
  channels,
  team,
}: {
  me: { id: string; name: string };
  channels: Channel[];
  team: TeamPick[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [channelList, setChannelList] = useState<Channel[]>(channels);
  const [activeId, setActiveId] = useState<number | null>(channels[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [authorCache, setAuthorCache] = useState<Record<string, string>>({ [me.id]: me.name });
  const bottomRef = useRef<HTMLDivElement>(null);

  // Último mensaje por canal (para preview en sidebar) y no-leídos
  const [lastMsgs, setLastMsgs] = useState<Record<number, { text: string; user_id: string | null }>>(() => {
    const init: Record<number, { text: string; user_id: string | null }> = {};
    for (const c of channels) {
      if (c.lastMsg) init[c.id] = { text: c.lastMsg.text, user_id: c.lastMsg.user_id };
    }
    return init;
  });
  const [unread, setUnread] = useState<Set<number>>(new Set());

  // Ref con los IDs actuales de canales: lo usa el polling sin necesitar re-suscribirse.
  const channelIdsRef = useRef<Set<number>>(new Set(channels.map((c) => c.id)));

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusRef = useRef<HTMLDivElement>(null);

  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [dmBusy, setDmBusy] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);
  const [dmQuery, setDmQuery] = useState("");

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [channelBusy, setChannelBusy] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  const active = channelList.find((c) => c.id === activeId) ?? null;
  const dms = channelList.filter((c) => c.is_dm);
  const rooms = channelList.filter((c) => !c.is_dm);

  // Al abrir un canal, marcar como leído
  useEffect(() => {
    if (activeId != null) {
      setUnread((prev) => {
        const next = new Set(prev);
        next.delete(activeId);
        return next;
      });
    }
  }, [activeId]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!plusRef.current?.contains(e.target as Node)) setPlusMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // Mantiene channelIdsRef sincronizado con el estado actual.
  useEffect(() => {
    channelIdsRef.current = new Set(channelList.map((c) => c.id));
  }, [channelList]);

  // Suscripción a mensajes en canales conocidos para actualizar previews y no-leídos.
  // Usa channelIdsRef.current para evitar stale closures cuando se ingieren canales nuevos.
  useEffect(() => {
    const sub = supabase
      .channel("unread-tracker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as Message;
          if (channelIdsRef.current.has(m.channel_id)) {
            setLastMsgs((prev) => ({ ...prev, [m.channel_id]: { text: m.text, user_id: m.user_id } }));
            if (m.channel_id !== activeId) {
              setUnread((prev) => new Set([...prev, m.channel_id]));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[chat] unread-tracker status:", status);
      });

    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convierte raw channel data en Channel y lo añade al estado si es nuevo.
  async function ingestNewChannelIds(ids: number[]) {
    const fresh = ids.filter((id) => !channelIdsRef.current.has(id));
    if (fresh.length === 0) return;

    // Marcamos los IDs como "conocidos" antes del fetch para evitar que el
    // próximo tick del polling vuelva a entrar en bucle si el fetch falla o
    // devuelve vacío. Si el fetch acaba bien, setChannelList también actualiza
    // la ref vía el useEffect de sincronización; si falla, al menos dejamos de
    // spammear peticiones idénticas cada 5s.
    for (const id of fresh) channelIdsRef.current.add(id);

    const { data: chData, error } = await supabase
      .from("chat_channels")
      .select("id, name, description, is_dm, dm_key, chat_channel_members(user_id, profiles(name))")
      .in("id", fresh);

    if (error) {
      console.error("[chat] ingestNewChannelIds error:", error.message, error.details, error.hint);
      // Revertimos la ref para reintentar en el próximo poll — quizá es transitorio.
      for (const id of fresh) channelIdsRef.current.delete(id);
      return;
    }

    if (!chData || chData.length === 0) {
      console.warn("[chat] ingestNewChannelIds: empty data for ids", fresh);
      return;
    }

    const newChs: Channel[] = (chData as any[]).map((ch) => {
      const members: MemberLite[] = (ch.chat_channel_members ?? []).map((mem: any) => {
        const prof = Array.isArray(mem.profiles) ? mem.profiles[0] : mem.profiles;
        return { id: mem.user_id, name: prof?.name ?? "—" };
      });
      const isDm = Boolean(ch.is_dm);
      return {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        is_dm: isDm,
        members,
        dm_other: isDm ? members.find((m) => m.id !== me.id) : undefined,
      };
    });

    setChannelList((prev) => {
      const additions = newChs.filter((nc) => !prev.some((p) => p.id === nc.id));
      if (additions.length === 0) return prev;
      setUnread((u) => new Set([...u, ...additions.map((c) => c.id)]));
      return [...prev, ...additions];
    });
  }

  // Realtime: reacciona al instante cuando alguien me añade a un canal.
  // Requiere que chat_channel_members esté en supabase_realtime publication.
  useEffect(() => {
    const sub = supabase
      .channel("my-memberships-rt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_channel_members",
          filter: `user_id=eq.${me.id}`,
        },
        (payload) => {
          const channelId = (payload.new as any).channel_id as number;
          console.log("[chat] new membership via realtime:", channelId);
          ingestNewChannelIds([channelId]);
        }
      )
      .subscribe((status, err) => {
        console.log("[chat] my-memberships-rt status:", status, err ?? "");
      });

    return () => { supabase.removeChannel(sub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling cada 5 s como respaldo al realtime. Corre inmediatamente al montar.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const { data: memberships, error } = await supabase
        .from("chat_channel_members")
        .select("channel_id")
        .eq("user_id", me.id);

      if (cancelled) return;
      if (error) {
        console.warn("[chat] poll error:", error.message);
        return;
      }

      const serverIds = (memberships ?? []).map((m: any) => m.channel_id as number);
      const knownIds = channelIdsRef.current;
      const newcomers = serverIds.filter((id) => !knownIds.has(id));
      if (newcomers.length > 0) {
        console.log("[chat] poll found new channels:", newcomers);
      }
      await ingestNewChannelIds(serverIds);
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fillAuthors(userIds: string[]) {
    const missing = userIds.filter((id) => id && !authorCache[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, name").in("id", missing);
    if (data) {
      setAuthorCache((prev) => {
        const next = { ...prev };
        for (const p of data as any[]) next[p.id] = p.name;
        return next;
      });
    }
  }

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

  async function openOrCreateDm(other: TeamPick) {
    if (dmBusy) return;
    setDmBusy(true);
    setDmError(null);

    // ¿Ya existe en el estado local?
    const existing = channelList.find((c) => c.is_dm && c.members.some((m) => m.id === other.id));
    if (existing) {
      setActiveId(existing.id);
      setDmModalOpen(false);
      setDmBusy(false);
      return;
    }

    // Función SECURITY DEFINER: crea el canal + ambos miembros atómicamente,
    // sin depender de RLS para el INSERT de la otra persona.
    const { data: rpcData, error: rpcErr } = await supabase.rpc("create_or_find_dm", {
      p_other_user_id: other.id,
    });

    if (rpcErr || !rpcData?.[0]) {
      setDmError(rpcErr?.message ?? "No se pudo crear el DM");
      setDmBusy(false);
      return;
    }

    const channelId: number = rpcData[0].r_channel_id;

    // Fetch del canal con miembros para construir el objeto local
    const { data: ch } = await supabase
      .from("chat_channels")
      .select("id, name, description, is_dm, dm_key, chat_channel_members(user_id, profiles(name))")
      .eq("id", channelId)
      .maybeSingle();

    const members: MemberLite[] = ch
      ? ((ch as any).chat_channel_members ?? []).map((mem: any) => {
          const prof = Array.isArray(mem.profiles) ? mem.profiles[0] : mem.profiles;
          return { id: mem.user_id, name: prof?.name ?? "—" };
        })
      : [{ id: me.id, name: me.name }, { id: other.id, name: other.name }];

    const asChannel: Channel = {
      id: channelId,
      name: ch ? (ch as any).name : `dm:${dmKey(me.id, other.id)}`,
      description: ch ? (ch as any).description : null,
      is_dm: true,
      members,
      dm_other: { id: other.id, name: other.name },
    };

    setChannelList((prev) => (prev.some((c) => c.id === asChannel.id) ? prev : [...prev, asChannel]));
    setActiveId(asChannel.id);
    setDmModalOpen(false);
    setDmBusy(false);
  }

  async function createChannel() {
    const name = newName.trim().replace(/^#+/, "").trim();
    if (!name || channelBusy) return;
    setChannelBusy(true);
    setChannelError(null);

    const { data: created, error } = await supabase
      .from("chat_channels")
      .insert({ name, description: newDesc.trim() || null, is_dm: false, created_by: me.id })
      .select("id, name, description")
      .single();

    if (error || !created) {
      setChannelError(error?.message ?? "No se pudo crear el canal");
      setChannelBusy(false);
      return;
    }

    const memberIds = Array.from(new Set([me.id, ...newMembers]));
    const { error: memErr } = await supabase
      .from("chat_channel_members")
      .insert(memberIds.map((uid) => ({ channel_id: created.id, user_id: uid })));

    if (memErr) {
      setChannelError(memErr.message);
      setChannelBusy(false);
      return;
    }

    const teamById = new Map(team.map((t) => [t.id, t.name]));
    const members: MemberLite[] = memberIds.map((id) => ({
      id,
      name: id === me.id ? me.name : teamById.get(id) ?? "—",
    }));

    const asChannel: Channel = {
      id: created.id,
      name: created.name,
      description: created.description,
      is_dm: false,
      members,
    };
    setChannelList((prev) =>
      [...prev, asChannel].sort((a, b) => a.name.localeCompare(b.name, "es"))
    );
    setActiveId(asChannel.id);
    setNewName("");
    setNewDesc("");
    setNewMembers([]);
    setChannelModalOpen(false);
    setChannelBusy(false);
  }

  const filteredDmCandidates = team
    .filter((t) => t.id !== me.id)
    .filter((t) => {
      const q = dmQuery.trim().toLowerCase();
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || (t.department ?? "").toLowerCase().includes(q);
    });

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
          <div ref={plusRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="nc-icon-btn"
              aria-label="Nueva conversación"
              aria-haspopup="menu"
              aria-expanded={plusMenuOpen}
              onClick={() => setPlusMenuOpen((v) => !v)}
            >
              <IPlus size={14} />
            </button>
            {plusMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: 200,
                  background: "var(--nc-surface)",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-md)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  padding: 4,
                  zIndex: 30,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setDmError(null);
                    setDmQuery("");
                    setDmModalOpen(true);
                  }}
                  style={menuItemStyle}
                >
                  Mensaje directo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setChannelError(null);
                    setNewName("");
                    setNewDesc("");
                    setNewMembers([]);
                    setChannelModalOpen(true);
                  }}
                  style={menuItemStyle}
                >
                  Nuevo canal
                </button>
              </div>
            )}
          </div>
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
          {channelList.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
              Sin conversaciones. Pulsa + para empezar.
            </div>
          ) : (
            <>
              {rooms.length > 0 && (
                <SectionLabel>Canales</SectionLabel>
              )}
              {rooms.map((c) => {
                const lm = lastMsgs[c.id];
                return (
                  <ChannelRow
                    key={c.id}
                    active={c.id === activeId}
                    unread={unread.has(c.id)}
                    onClick={() => setActiveId(c.id)}
                    avatar={<ChannelTile />}
                    title={`# ${c.name}`}
                    subtitle={lm ? lm.text : (c.description || `${c.members.length} miembro${c.members.length !== 1 ? "s" : ""}`)}
                  />
                );
              })}
              {dms.length > 0 && <SectionLabel>Mensajes directos</SectionLabel>}
              {dms.map((c) => {
                const other = c.dm_other;
                const lm = lastMsgs[c.id];
                return (
                  <ChannelRow
                    key={c.id}
                    active={c.id === activeId}
                    unread={unread.has(c.id)}
                    onClick={() => setActiveId(c.id)}
                    avatar={other ? <Avatar id={other.id} name={other.name} /> : <ChannelTile />}
                    title={other?.name ?? "Conversación"}
                    subtitle={lm ? lm.text : "Mensaje directo"}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Conversation pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--nc-bg)" }}>
        {active ? (
          <>
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
              {active.is_dm && active.dm_other ? (
                <Avatar id={active.dm_other.id} name={active.dm_other.name} size="lg" />
              ) : (
                <ChannelTile />
              )}
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {active.is_dm
                    ? active.dm_other?.name ?? "Conversación"
                    : `# ${active.name}`}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                  {active.is_dm
                    ? "Mensaje directo"
                    : active.description || `${active.members.length} miembro${active.members.length !== 1 ? "s" : ""}`}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button className="nc-icon-btn">
                <IMore size={15} />
              </button>
            </div>

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
                <div style={{ margin: "auto", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                  {active.is_dm
                    ? "Sin mensajes todavía. Saluda a esta persona."
                    : "No hay mensajes en este canal. Sé el primero en escribir."}
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
                        {!mine && !active.is_dm && (
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
                          <div style={{ fontSize: 12.5, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{m.text}</div>
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
                placeholder={
                  active.is_dm
                    ? `Mensaje para ${active.dm_other?.name ?? ""}…`
                    : `Escribe en #${active.name}…`
                }
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
            Sin conversaciones. Pulsa + para crear una.
          </div>
        )}
      </div>

      {/* Modal: DM */}
      {dmModalOpen && (
        <ModalShell onClose={() => !dmBusy && setDmModalOpen(false)} title="Mensaje directo">
          <div style={{ padding: "12px 16px" }}>
            <input
              autoFocus
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              placeholder="Buscar persona…"
              className="nc-input"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", marginBottom: 10 }}
            />
            <div style={{ maxHeight: 320, overflow: "auto", margin: "0 -4px" }}>
              {filteredDmCandidates.length === 0 ? (
                <div style={{ padding: "18px 10px", fontSize: 12, color: "var(--nc-mute)", textAlign: "center" }}>
                  Sin coincidencias
                </div>
              ) : (
                filteredDmCandidates.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openOrCreateDm(p)}
                    disabled={dmBusy}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "8px 10px",
                      background: "transparent", borderRadius: 6,
                      fontSize: 12.5, textAlign: "left",
                      cursor: dmBusy ? "wait" : "pointer",
                    }}
                  >
                    <Avatar id={p.id} name={p.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: "var(--nc-ink)" }}>{p.name}</div>
                      {p.department && (
                        <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>{p.department}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            {dmError && (
              <div style={{ fontSize: 11.5, color: "var(--nc-danger)", marginTop: 8 }}>{dmError}</div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Modal: Nuevo canal */}
      {channelModalOpen && (
        <ModalShell onClose={() => !channelBusy && setChannelModalOpen(false)} title="Nuevo canal">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createChannel();
            }}
            style={{ padding: "12px 16px" }}
          >
            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 4 }}>Nombre del canal</div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="logistica"
                required
                className="nc-input"
                style={{ width: "100%", fontSize: 13, padding: "7px 10px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 4 }}>Descripción (opcional)</div>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Para qué sirve este canal"
                className="nc-input"
                style={{ width: "100%", fontSize: 13, padding: "7px 10px" }}
              />
            </label>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 4 }}>
                Añadir miembros {newMembers.length > 0 && `· ${newMembers.length} seleccionado${newMembers.length !== 1 ? "s" : ""}`}
              </div>
              <div
                style={{
                  maxHeight: 220, overflow: "auto",
                  border: "1px solid var(--nc-line)", borderRadius: "var(--r-sm)",
                  padding: 4,
                }}
              >
                {team.filter((t) => t.id !== me.id).length === 0 ? (
                  <div style={{ padding: "18px 10px", fontSize: 12, color: "var(--nc-mute)", textAlign: "center" }}>
                    No hay más miembros para añadir
                  </div>
                ) : (
                  team
                    .filter((t) => t.id !== me.id)
                    .map((p) => {
                      const on = newMembers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setNewMembers((prev) =>
                              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            )
                          }
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "6px 8px",
                            background: on ? "var(--nc-green-soft)" : "transparent",
                            borderRadius: 4,
                            fontSize: 12, textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              width: 14, height: 14, borderRadius: 3,
                              border: "1.5px solid var(--nc-line)",
                              background: on ? "var(--nc-green)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", flexShrink: 0,
                            }}
                          >
                            {on && <ICheck size={9} />}
                          </span>
                          <Avatar id={p.id} name={p.name} size="sm" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500 }}>{p.name}</div>
                            {p.department && (
                              <div style={{ fontSize: 10, color: "var(--nc-mute)" }}>{p.department}</div>
                            )}
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            {channelError && (
              <div style={{ fontSize: 11.5, color: "var(--nc-danger)", marginBottom: 8 }}>{channelError}</div>
            )}

            <div
              style={{
                display: "flex", justifyContent: "flex-end", gap: 8,
                paddingTop: 10, borderTop: "1px solid var(--nc-line)",
              }}
            >
              <button
                type="button"
                className="nc-btn ghost"
                style={{ fontSize: 12 }}
                onClick={() => setChannelModalOpen(false)}
                disabled={channelBusy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="nc-btn primary"
                style={{ fontSize: 12 }}
                disabled={channelBusy || !newName.trim()}
              >
                {channelBusy ? "Creando…" : "Crear canal"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "7px 10px",
  fontSize: 12.5,
  color: "var(--nc-ink)",
  background: "transparent",
  borderRadius: 4,
  cursor: "pointer",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        color: "var(--nc-mute)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "10px 14px 4px",
      }}
    >
      {children}
    </div>
  );
}

function ChannelRow({
  active,
  unread,
  onClick,
  avatar,
  title,
  subtitle,
}: {
  active: boolean;
  unread: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", gap: 10,
        padding: "8px 14px",
        background: active ? "var(--nc-green-soft)" : "transparent",
        borderBottom: "1px solid var(--nc-line-2)",
        width: "100%", textAlign: "left", alignItems: "flex-start",
        cursor: "pointer",
      }}
    >
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              flex: 1, minWidth: 0,
              fontSize: 12.5, fontWeight: unread ? 700 : 600,
              color: "var(--nc-ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {unread && (
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--nc-green)", flexShrink: 0,
            }} />
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: unread ? "var(--nc-ink)" : "var(--nc-mute)",
            fontWeight: unread ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 40 }}
      />
      <div
        style={{
          position: "fixed", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, zIndex: 41,
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 460,
            background: "var(--nc-surface)",
            borderRadius: "var(--r-lg)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--nc-line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
            <button type="button" className="nc-icon-btn" aria-label="Cerrar" onClick={onClose}>
              <IX size={14} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
