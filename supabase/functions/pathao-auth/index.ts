import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read credentials from admin_settings
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["pathao_client_id", "pathao_client_secret", "pathao_username", "pathao_password"]);

    const creds: Record<string, string> = {};
    settings?.forEach((s: any) => { creds[s.key] = s.value || ""; });

    if (!creds.pathao_client_id || !creds.pathao_client_secret || !creds.pathao_username || !creds.pathao_password) {
      return new Response(JSON.stringify({ error: "Missing Pathao credentials in settings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://hermes-api.pathao.com/aladdin/api/v1/issue-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: creds.pathao_client_id,
        client_secret: creds.pathao_client_secret,
        username: creds.pathao_username,
        password: creds.pathao_password,
        grant_type: "password",
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.access_token) {
      return new Response(JSON.stringify({ error: result.message || "Authentication failed", details: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save tokens
    const expiresAt = new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString();
    const updates = [
      { key: "pathao_access_token", value: result.access_token },
      { key: "pathao_refresh_token", value: result.refresh_token || "" },
      { key: "pathao_token_expires_at", value: expiresAt },
    ];

    for (const u of updates) {
      await supabase.from("admin_settings").update({ value: u.value }).eq("key", u.key);
    }

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
