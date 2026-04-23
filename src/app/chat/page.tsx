import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChatClient } from "@/components/chat-client";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, channelsRes] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("chat_channels")
      .select("id, name, description")
      .order("name", { ascending: true }),
  ]);

  const me = {
    id: user.id,
    name: profileRes.data?.name ?? user.email?.split("@")[0] ?? "Tú",
  };
  const channels = channelsRes.data ?? [];

  return (
    <div className="nc-app-shell">
      <Sidebar active="chat" compact />
      <ChatClient me={me} channels={channels} />
    </div>
  );
}
