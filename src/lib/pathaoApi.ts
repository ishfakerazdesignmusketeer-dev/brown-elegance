const N8N_BASE = "https://n8n.srv1202488.hstgr.cloud/webhook";

export const PATHAO_STATUS_MAP: Record<string, string> = {
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

export async function pathaoGetToken(
  client_id: string,
  client_secret: string,
  username: string,
  password: string
) {
  const res = await fetch(`${N8N_BASE}/pathao-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret, username, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "Auth failed");
  return data;
}

async function pathaoRefreshToken(
  client_id: string,
  client_secret: string,
  refresh_token: string
) {
  const res = await fetch(`${N8N_BASE}/pathao-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "Token refresh failed");
  return data;
}

export async function pathaoGetValidToken(supabase: any): Promise<string> {
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", [
      "pathao_access_token",
      "pathao_refresh_token",
      "pathao_token_expires_at",
      "pathao_client_id",
      "pathao_client_secret",
    ]);

  const s: Record<string, string> = {};
  settings?.forEach((r: any) => { s[r.key] = r.value || ""; });

  const expiresAt = new Date(s.pathao_token_expires_at || 0).getTime();
  if (s.pathao_access_token && expiresAt - Date.now() > 3600000) {
    return s.pathao_access_token;
  }

  if (!s.pathao_refresh_token) {
    throw new Error("Pathao token expired. Please reconnect in Settings → Pathao Integration.");
  }

  const refreshed = await pathaoRefreshToken(
    s.pathao_client_id,
    s.pathao_client_secret,
    s.pathao_refresh_token
  );

  const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
  const updates = [
    { key: "pathao_access_token", value: refreshed.access_token },
    { key: "pathao_refresh_token", value: refreshed.refresh_token || s.pathao_refresh_token },
    { key: "pathao_token_expires_at", value: newExpiry },
  ];
  for (const u of updates) {
    await supabase.from("admin_settings").update({ value: u.value }).eq("key", u.key);
  }

  return refreshed.access_token;
}

async function pathaoQuery(access_token: string, action: string, params: any = {}) {
  const res = await fetch(`${N8N_BASE}/pathao-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token, action, ...params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "Query failed");
  return data.data;
}

export async function pathaoCreateOrder(access_token: string, orderData: {
  store_id: number;
  merchant_order_id: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area: number;
  delivery_type: number;
  item_type: number;
  special_instruction: string;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description: string;
}) {
  const res = await fetch(`${N8N_BASE}/pathao-create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token, ...orderData }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "Order creation failed");
  return data.data;
}

export const pathaoGetCities = (token: string) =>
  pathaoQuery(token, "get_cities");

export const pathaoGetZones = (token: string, city_id: number) =>
  pathaoQuery(token, "get_zones", { city_id });

export const pathaoGetAreas = (token: string, zone_id: number) =>
  pathaoQuery(token, "get_areas", { zone_id });

export const pathaoTrackOrder = (token: string, consignment_id: string) =>
  pathaoQuery(token, "track_order", { consignment_id });
