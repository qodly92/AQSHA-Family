// Pengingat harian (kalender + servis aset) via WhatsApp (Fonnte) dan email (Resend).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const env = (k: string) => Deno.env.get(k);
const sb = createClient(env("https://evpnkvgsuqqvwgsecvdt.supabase.co/rest/v1/")!, env("sb_publishable_4pKiwlCLbXPX5iojHHkkWA_P35fhwHf")!);
// tanggal WIB (UTC+7), n hari dari hari ini
const day = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 864e5).toISOString().slice(0, 10);

Deno.serve(async () => {
  const { data, error } = await sb.from("records").select("module,data").in("module", ["kalender", "aset", "profil"]);
  if (error) return new Response(error.message, { status: 500 });
  const rows = data ?? [];
  const soon = new Set([day(0), day(1), day(3)]);
  const items = rows
    .filter((r) => r.module !== "profil" && soon.has(r.data.tgl))
    .map((r) => `${r.data.tgl}: ${r.module === "aset" ? "Servis " + r.data.nama : r.data.judul}`);
  if (!items.length) return new Response("tidak ada pengingat");

  const text = "[AQSHA Family] Pengingat:\n" + items.join("\n");
  let sent = 0;
  for (const p of rows.filter((r) => r.module === "profil").map((r) => r.data)) {
    if (p.hp && env("FONNTE_TOKEN")) {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: env("FONNTE_TOKEN")! },
        body: new URLSearchParams({ target: p.hp, message: text }),
      });
      sent++;
    }
    if (p.email && env("RESEND_API_KEY")) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env("MAIL_FROM"), to: p.email, subject: "Pengingat AQSHA Family", text }),
      });
      sent++;
    }
  }
  return new Response(`terkirim ${sent}`);
});
