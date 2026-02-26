const PATHAO_BASE = "https://hermes-api.pathao.com/aladdin/api/v1";

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

async function pathaoFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || JSON.stringify(data));
  }
  return data;
}

export async function pathaoGetToken(
  client_id: string,
  client_secret: string,
  username: string,
  password: string
) {
  return pathaoFetch(`${PATHAO_BASE}/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
  });
}

export async function pathaoRefreshToken(
  client_id: string,
  client_secret: string,
  refresh_token: string
) {
  return pathaoFetch(`${PATHAO_BASE}/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
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

export async function pathaoGetCities(token: string) {
  const data = await pathaoFetch(`${PATHAO_BASE}/countries/cities`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return (data.data?.data || data.data || []).map((c: any) => ({
    city_id: c.city_id,
    city_name: c.city_name,
  }));
}

export async function pathaoGetZones(token: string, city_id: number) {
  const data = await pathaoFetch(`${PATHAO_BASE}/cities/${city_id}/zone-list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return (data.data?.data || data.data || []).map((z: any) => ({
    zone_id: z.zone_id,
    zone_name: z.zone_name,
  }));
}

export async function pathaoGetAreas(token: string, zone_id: number) {
  const data = await pathaoFetch(`${PATHAO_BASE}/zones/${zone_id}/area-list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return (data.data?.data || data.data || []).map((a: any) => ({
    area_id: a.area_id,
    area_name: a.area_name,
  }));
}

export async function pathaoCreateOrder(token: string, orderData: {
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
  const data = await pathaoFetch(`${PATHAO_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(orderData),
  });
  return data.data || data;
}

export async function pathaoTrackOrder(token: string, consignment_id: string) {
  const data = await pathaoFetch(`${PATHAO_BASE}/orders/${consignment_id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return data.data || data;
}
