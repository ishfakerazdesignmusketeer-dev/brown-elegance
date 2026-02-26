import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidToken(supabase: any): Promise<string> {
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["pathao_access_token", "pathao_refresh_token", "pathao_token_expires_at", "pathao_client_id", "pathao_client_secret"]);

  const s: Record<string, string> = {};
  settings?.forEach((r: any) => { s[r.key] = r.value || ""; });

  const expiresAt = new Date(s.pathao_token_expires_at || 0).getTime();
  const now = Date.now();

  // If token valid for > 1 hour, use it
  if (s.pathao_access_token && expiresAt - now > 3600000) {
    return s.pathao_access_token;
  }

  // Try refresh
  if (s.pathao_refresh_token) {
    const res = await fetch("https://hermes-api.pathao.com/aladdin/api/v1/issue-token", {
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

  throw new Error("Pathao token expired. Please reconnect in Settings → Pathao Integration.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = await getValidToken(supabase);

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    // Get store settings
    const { data: storeSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["pathao_store_id", "pathao_sender_phone"]);
    const store: Record<string, string> = {};
    storeSettings?.forEach((r: any) => { store[r.key] = r.value || ""; });

    if (!order.recipient_city_id || !order.recipient_zone_id) {
      throw new Error("Missing recipient city/zone. Please set Pathao location data first.");
    }

    const totalItems = (order.order_items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
    const itemDesc = order.item_description ||
      (order.order_items || []).map((i: any) => `${i.product_name} (${i.size}) x${i.quantity}`).join(", ");

    const payload = {
      store_id: parseInt(store.pathao_store_id || "372992"),
      merchant_order_id: order.order_number,
      sender_name: "Brown House",
      sender_phone: store.pathao_sender_phone || "",
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      recipient_address: order.customer_address,
      recipient_city: order.recipient_city_id,
      recipient_zone: order.recipient_zone_id,
      recipient_area: order.recipient_area_id || 0,
      delivery_type: order.delivery_type || 48,
      item_type: 2,
      special_instruction: order.notes || "",
      item_quantity: totalItems || 1,
      item_weight: order.item_weight || 0.5,
      amount_to_collect: order.amount_to_collect ?? order.total,
      item_description: itemDesc,
    };

    const response = await fetch("https://hermes-api.pathao.com/aladdin/api/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.type === "error") {
      return new Response(JSON.stringify({ error: result.message || "Failed to create order on Pathao", details: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consignmentId = result.data?.consignment_id || result.consignment_id;

    // Update order
    await supabase.from("orders").update({
      pathao_consignment_id: String(consignmentId),
      pathao_status: result.data?.order_status || "Pending",
      pathao_sent_at: new Date().toISOString(),
      status: "sent_to_courier",
    }).eq("id", order_id);

    // Add note
    await supabase.from("order_notes").insert({
      order_id,
      note: `Sent to Pathao Courier. Consignment: ${consignmentId}`,
      created_by: "system",
    });

    return new Response(JSON.stringify({ success: true, consignment_id: consignmentId, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
