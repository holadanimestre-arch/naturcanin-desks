import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChatClient } from "@/components/chat-client";
import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/supabase/team";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Round 1 – en paralelo: perfil, memberships del usuario y equipo
  const [profileRes, myMembershipsRes, team] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", user.id),
    getTeam(),
  ]);

  const myIds = (myMembershipsRes.data ?? []).map((m: any) => m.channel_id as number);

  // Round 2 – canales donde soy miembro + canales legacy (sin miembros)
  const [myChannelsRes, legacyRes] = await Promise.all([
    myIds.length > 0
      ? supabase
          .from("chat_channels")
          .select(`id, name, description, is_dm, dm_key, chat_channel_members(user_id, profiles(name))`)
          .in("id", myIds)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),

    supabase
      .from("chat_channels")
      .select(`id, name, description, is_dm, dm_key, chat_channel_members(user_id, profiles(name))`)
      .eq("is_dm", false)
      .order("name", { ascending: true }),
  ]);

  const me = {
    id: user.id,
    name: profileRes.data?.name ?? user.email?.split("@")[0] ?? "Tú",
  };

  type MemberLite = { id: string; name: string };

  type RawChannel = {
    id: number;
    name: string;
    description: string | null;
    is_dm: boolean | null;
    dm_key: string | null;
    chat_channel_members: Array<{
      user_id: string;
      profiles: { name: string } | { name: string }[] | null;
    }>;
  };

  const myChannelsRaw = (myChannelsRes.data ?? []) as unknown as RawChannel[];
  const legacyRaw = (legacyRes.data ?? []) as unknown as RawChannel[];

  const myIdSet = new Set(myIds);
  const legacyOnly = legacyRaw.filter(
    (c) => !myIdSet.has(c.id) && (c.chat_channel_members ?? []).length === 0
  );

  const allRaw = [...myChannelsRaw, ...legacyOnly];
  const allIds = allRaw.map((c) => c.id);

  // Round 3 – último mensaje de cada canal
  const { data: recentMsgs } = allIds.length > 0
    ? await supabase
        .from("chat_messages")
        .select("channel_id, text, created_at, user_id")
        .in("channel_id", allIds)
        .order("created_at", { ascending: false })
        .limit(allIds.length * 3)
    : { data: [] as any[] };

  // Quedarnos solo con el último por canal
  const lastMsgMap = new Map<number, { text: string; created_at: string; user_id: string | null }>();
  for (const m of (recentMsgs ?? []) as any[]) {
    if (!lastMsgMap.has(m.channel_id)) lastMsgMap.set(m.channel_id, m);
  }

  const channels: Array<{
    id: number;
    name: string;
    description: string | null;
    is_dm: boolean;
    members: MemberLite[];
    dm_other?: MemberLite;
    lastMsg?: { text: string; created_at: string; user_id: string | null };
  }> = [];

  for (const c of allRaw) {
    const members: MemberLite[] = (c.chat_channel_members ?? []).map((m) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return { id: m.user_id, name: prof?.name ?? "—" };
    });
    const isDm = Boolean(c.is_dm);

    let dm_other: MemberLite | undefined;
    if (isDm) {
      dm_other = members.find((m) => m.id !== me.id) ?? members[0];
    }

    channels.push({
      id: c.id,
      name: c.name,
      description: c.description,
      is_dm: isDm,
      members,
      dm_other,
      lastMsg: lastMsgMap.get(c.id),
    });
  }

  const teamPicks = team.map((m) => ({ id: m.id, name: m.name, department: m.department }));

  return (
    <div className="nc-app-shell">
      <Sidebar active="chat" compact />
      <ChatClient me={me} channels={channels} team={teamPicks} />
    </div>
  );
}
