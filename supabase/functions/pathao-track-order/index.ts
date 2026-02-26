import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PATHAO_TO_BROWN: Record<string, string> = {
  Pending: "sent_to_courier",
  Pickup_Requested: "sent_to_courier",
  Picked: "picked_up",
  In_Transit: "in_transit",
  Delivered: "completed",
  Returned: "returned",
  Cancelled: "cancelled",
  Return_In_Transit: "returned",
  Partial_Delivered: "completed",
};

async function getValidToken(supabase: any): Promise<string> {
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["pathao_access_token", "pathao_refresh_token", "pathao_token_expires_at", "pathao_client_id", "pathao_client_secret"]);

  const s: Record<string, string> = {};
  settings?.forEach((r: any) => { s[r.key] = r.value || ""; });

  const expiresAt = new Date(s.pathao_token_expires_at || 0).getTime();
  if (s.pathao_access_token && expiresAt - Date.now() > 3600000) return s.pathao_access_token;

  if (s.pathao_refresh_token) {
    const res = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/issue-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: s.pathao_client_id,
        client_secret: s.pathao_client_secret,
        refresh_token: s.pathao_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      await supabase.from("admin_settings").update({ value: data.access_token }).eq("key", "pathao_access_token");
      await supabase.from("admin_settings").update({ value: data.refresh_token || s.pathao_refresh_token }).eq("key", "pathao_refresh_token");
      await supabase.from("admin_settings").update({ value: newExpiry }).eq("key", "pathao_token_expires_at");
      return data.access_token;
    }
  }
  throw new Error("Pathao token expired. Please reconnect in Settings.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, consignment_id } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let cid = consignment_id;
    let oid = order_id;

    if (!cid && oid) {
      const { data: order } = await supabase.from("orders").select("pathao_consignment_id").eq("id", oid).single();
      cid = order?.pathao_consignment_id;
    }
    if (!cid) throw new Error("No consignment ID");

    const token = await getValidToken(supabase);

    const response = await fetch(`https://api-hermes.pathao.com/aladdin/api/v1/orders/${cid}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const result = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: result.message || "Tracking failed", details: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pathaoStatus = result.data?.order_status || result.order_status || "";
    const brownStatus = PATHAO_TO_BROWN[pathaoStatus] || null;

    // Update order if we have order_id
    if (oid) {
      const updateData: any = { pathao_status: pathaoStatus };
      if (brownStatus) updateData.status = brownStatus;
      await supabase.from("orders").update(updateData).eq("id", oid);
    } else {
      // Find by consignment ID
      const { data: matchOrder } = await supabase.from("orders").select("id").eq("pathao_consignment_id", cid).single();
      if (matchOrder) {
        const updateData: any = { pathao_status: pathaoStatus };
        if (brownStatus) updateData.status = brownStatus;
        await supabase.from("orders").update(updateData).eq("id", matchOrder.id);
      }
    }

    return new Response(JSON.stringify({ success: true, pathao_status: pathaoStatus, brown_status: brownStatus, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
