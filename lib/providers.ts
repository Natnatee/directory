import "server-only";

export interface Provider {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  area: string;
  serviceArea: string;
  phone: string;
  email: string;
  website: string;
  facebook: string;
  line: string;
  image: string;
  details: { label: string; value: string }[];
}

const endpoint =
  "https://script.google.com/macros/s/AKfycbzlicXm9k3aQdhArJ6x_V9xI3ZRqLO7lGJVrZdpxduET6oDaw7beZO4y08gpyB1W2blFQ/exec?action=all";

type Row = Record<string, unknown>;

const detailFields = [
  ["languages", "ภาษา"],
  ["availability", "เวลาที่ให้บริการ"],
  ["lead_time", "ระยะเวลาเตรียมงาน"],
  ["payment", "การชำระเงิน"],
  ["film_experience", "ประสบการณ์งานถ่ายทำ"],
  ["track_record", "ผลงานที่ผ่านมา"],
  ["loc_type", "ประเภทสถานที่"],
  ["loc_facilities", "สิ่งอำนวยความสะดวก"],
  ["hotel_rooms", "จำนวนห้องพัก"],
  ["hotel_star", "ระดับโรงแรม"],
  ["crew_role", "ตำแหน่งงาน"],
  ["crew_experience", "ประสบการณ์ทีมงาน"],
  ["cater_cuisine", "ประเภทอาหาร"],
] as const;

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function webUrl(value: unknown): string {
  const valueText = text(value);
  const raw = /^www\./i.test(valueText) ? `https://${valueText}` : valueText;
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function emailAddress(value: unknown): string {
  const raw = text(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : "";
}

function isRow(value: unknown): value is Row {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function getProviders(): Promise<Provider[]> {
  const response = await fetch(endpoint, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Provider data request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isRow(data) || !Array.isArray(data.sheets)) {
    throw new Error("Invalid provider data response");
  }

  const directory = data.sheets.find(
    (sheet: unknown) => isRow(sheet) && sheet.name === "Directory",
  );
  if (!isRow(directory) || !Array.isArray(directory.rows)) {
    throw new Error("Directory sheet not found");
  }

  // This private demo intentionally includes unpublished rows; only allowlisted fields leave the server.
  return directory.rows.filter(isRow).flatMap((row): Provider[] => {
    const id = text(row.record_id);
    if (!id) return [];

    const emailWeb = text(row.email_web);
    const contactUrl = webUrl(emailWeb);
    const portfolioUrl = webUrl(row.portfolio_link);
    return [{
      id,
      name: text(row.name_th),
      nameEn: text(row.name_en),
      category: text(row.display_category) === "(จัดมือ)"
        ? text(row.form_category) || "อื่น ๆ"
        : text(row.display_category) || text(row.form_category),
      area: text(row.location_zone),
      serviceArea: text(row.service_area),
      phone: text(row.phone_main),
      email: emailAddress(emailWeb),
      website: contactUrl && !/facebook\.com|line\.me/i.test(contactUrl) ? contactUrl : portfolioUrl && !/facebook\.com|line\.me/i.test(portfolioUrl) ? portfolioUrl : "",
      facebook: /facebook\.com/i.test(contactUrl) ? contactUrl : /facebook\.com/i.test(portfolioUrl) ? portfolioUrl : "",
      line: /line\.me/i.test(contactUrl) ? contactUrl : /line\.me/i.test(portfolioUrl) ? portfolioUrl : "",
      image: "",
      details: detailFields.flatMap(([key, label]) => {
        const value = text(row[key]);
        return value ? [{ label, value }] : [];
      }),
    }];
  });
}
