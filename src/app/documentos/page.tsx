export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { SidebarServer as Sidebar } from "@/components/sidebar-server";
import { DocumentsClient } from "@/components/documents-client";
import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/supabase/team";

export default async function DocumentosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [docsRes, sharesRes, folderSharesRes, team] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, size, mime_type, storage_path, created_at, owner_id, folder")
      .order("created_at", { ascending: false }),
    supabase
      .from("document_shares")
      .select("document_id, shared_with_user_id"),
    supabase
      .from("document_folder_shares")
      .select("id, owner_id, folder_path, shared_with_user_id"),
    getTeam(),
  ]);

  const docs = (docsRes.data ?? []) as {
    id: string; name: string; size: number | null; mime_type: string | null;
    storage_path: string; created_at: string; owner_id: string; folder: string | null;
  }[];

  const shares = (sharesRes.data ?? []) as {
    document_id: string; shared_with_user_id: string;
  }[];

  const folderShares = (folderSharesRes.data ?? []) as {
    id: string; owner_id: string; folder_path: string; shared_with_user_id: string;
  }[];

  const teamPicks = team.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="nc-app-shell">
      <Sidebar active="docs" />
      <DocumentsClient
        me={{ id: user.id }}
        docs={docs}
        shares={shares}
        folderShares={folderShares}
        team={teamPicks}
      />
    </div>
  );
}
