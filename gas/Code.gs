const CONFIG = {
  spreadsheetId: "1wQ5QQaNj9QpsUdH4LqQEke8-j04spNyfCYK1iCn7K6I",
  rounds: ["รอบ 1", "รอบ 2"],
  reviewSheet: "ตรวจจับคู่",
  imageBatchSize: 5,
  imageLimit: 12,
};

// ทุกฟังก์ชัน runXX เรียกจากปุ่ม Run ใน editor เท่านั้น ไม่เปิดผ่าน query string
function run01_prepareSheets() {
  withLock(function () {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    CONFIG.rounds.forEach(function (name) {
      const sheet = requiredSheet(ss, name);
      ensureColumns(sheet, ["source_id", "record_id", "published", "images_json", "image_status"]);
      const table = readTable(sheet);
      table.rows.forEach(function (row) {
        if (!businessName(row, name)) return;
        const sourceId = str(row.data.source_id) || "PFD-" + Utilities.getUuid();
        setIfBlank(sheet, table, row, "source_id", sourceId);
        setIfBlank(sheet, table, row, "record_id", sourceId);
        setIfBlank(sheet, table, row, "published", "FALSE");
      });
    });
    console.log("เตรียมคอลัมน์แล้ว: ไม่เปลี่ยน ID หรือ published ที่มีค่าเดิม");
  });
}

function run02_createMatchReview() {
  withLock(function () {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    if (ss.getSheetByName(CONFIG.reviewSheet)) {
      throw new Error("มีแท็บตรวจจับคู่แล้ว ไม่เขียนทับ; ใช้ตารางเดิม หรือเปลี่ยนชื่อแท็บเดิมเพื่อเก็บประวัติก่อนสร้างใหม่");
    }
    const first = readTable(requiredSheet(ss, CONFIG.rounds[0])).rows.filter(function (r) { return businessName(r, CONFIG.rounds[0]); });
    const second = readTable(requiredSheet(ss, CONFIG.rounds[1])).rows.filter(function (r) { return businessName(r, CONFIG.rounds[1]); });
    assertSourceIds(first.concat(second));
    const output = [["round2_source_id", "round2_name", "round1_source_id", "round1_name", "approved", "reason"]];
    second.forEach(function (r2) {
      const names2 = names(r2, CONFIG.rounds[1]);
      const matches = first.filter(function (r1) {
        return names(r1, CONFIG.rounds[0]).some(function (n) { return names2.indexOf(n) !== -1; });
      });
      if (!matches.length) {
        output.push([r2.data.source_id, businessName(r2, CONFIG.rounds[1]), "", "", "FALSE", "ไม่พบชื่อที่ตรงกัน: ตรวจเอง หรือปล่อยเป็นกิจการใหม่"]);
      } else {
        matches.forEach(function (r1) {
          output.push([r2.data.source_id, businessName(r2, CONFIG.rounds[1]), r1.data.source_id, businessName(r1, CONFIG.rounds[0]), "FALSE", "ชื่อเท่ากันหลังตัดช่องว่าง/ตัวพิมพ์: เป็นเพียงข้อเสนอ ต้องตรวจคนละกิจการ/หลายหมวด"]);
        });
      }
    });
    const review = ss.insertSheet(CONFIG.reviewSheet);
    review.getRange(1, 1, output.length, output[0].length).setValues(output.map(function (cells) {
      return cells.map(function (v) { return str(v).startsWith("=") ? "'" + v : v; });
    }));
    review.setFrozenRows(1);
    review.getRange(2, 5, Math.max(1, output.length - 1), 1).insertCheckboxes();
    review.autoResizeColumns(1, 6);
    console.log("สร้างตารางแล้ว: ไม่มีคู่ใดได้รับอนุมัติอัตโนมัติ และไม่ใช้เบอร์โทรเป็นเกณฑ์จับคู่");
  });
}

function run03_applyApprovedMatches() {
  withLock(function () {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    const sheet1 = requiredSheet(ss, CONFIG.rounds[0]);
    const sheet2 = requiredSheet(ss, CONFIG.rounds[1]);
    const first = readTable(sheet1);
    const second = readTable(sheet2);
    assertSourceIds(first.rows.concat(second.rows).filter(function (r) { return str(r.data.source_id); }));
    const reviews = readTable(requiredSheet(ss, CONFIG.reviewSheet)).rows;
    const map1 = new Map(first.rows.map(function (r) { return [str(r.data.source_id), r]; }));
    const map2 = new Map(second.rows.map(function (r) { return [str(r.data.source_id), r]; }));
    const approved = new Map();
    reviews.forEach(function (review) {
      if (!isTrue(review.data.approved)) return;
      const from = str(review.data.round2_source_id);
      const to = str(review.data.round1_source_id);
      if (!map1.has(to) || !map2.has(from) || !from || !to) throw new Error("คู่ที่อนุมัติมี source_id ไม่ถูกต้อง แถว " + review.number);
      if (approved.has(from) && approved.get(from) !== to) throw new Error("รอบ 2 รายการเดียวถูกจับคู่หลายกิจการ แถว " + review.number);
      if (!str(map1.get(to).data.record_id)) throw new Error("รอบ 1 ไม่มี record_id");
      approved.set(from, to);
    });
    // ตรวจคู่ทั้งหมดก่อนเริ่มเขียน; source_id คงเดิมเพื่อรันซ้ำได้แม้ record_id เปลี่ยน
    approved.forEach(function (to, from) {
      const row = map2.get(from);
      sheet2.getRange(row.number, column(second, "record_id")).setValue(str(map1.get(to).data.record_id));
    });
    console.log("ใช้คู่ที่อนุมัติ " + approved.size + " คู่; แถวอื่นคง ID เดิมและไม่เปลี่ยน published");
  });
}

function run04_syncImagesBatch() {
  withLock(function () {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    let processed = 0;
    let remaining = 0;
    const deadline = Date.now() + 180000;
    CONFIG.rounds.forEach(function (name) {
      const sheet = requiredSheet(ss, name);
      const table = readTable(sheet);
      table.rows.forEach(function (row) {
        if (!businessName(row, name) || str(row.data.image_status)) return;
        if (processed >= CONFIG.imageBatchSize || Date.now() >= deadline) { remaining++; return; }
        processed++;
        const match = str(row.data["ลิ้งรูป"]).match(/^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]+)/);
        let images = [];
        let status = "NO_FOLDER";
        if (match) {
          try {
            const files = DriveApp.getFolderById(match[1]).getFiles();
            while (files.hasNext()) {
              const file = files.next();
              if (!file.getMimeType().startsWith("image/")) continue;
              const access = file.getSharingAccess();
              // ไม่เปลี่ยนสิทธิ์ Drive และไม่ส่งไฟล์ที่รู้ว่าเปิดไม่ได้ให้ browser
              if (access !== DriveApp.Access.ANYONE && access !== DriveApp.Access.ANYONE_WITH_LINK) continue;
              images.push({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType() });
            }
            images.sort(function (a, b) { return a.name.localeCompare(b.name) || a.id.localeCompare(b.id); });
            images = images.slice(0, CONFIG.imageLimit);
            status = images.length ? "OK" : "NO_PUBLIC_IMAGES";
          } catch (error) {
            status = "ERROR";
            console.warn("อ่านโฟลเดอร์ไม่ได้: " + name + " แถว " + row.number + " — " + error.message);
          }
        }
        sheet.getRange(row.number, column(table, "images_json")).setValue(JSON.stringify(images));
        sheet.getRange(row.number, column(table, "image_status")).setValue(status);
      });
    });
    console.log("ประมวลผล " + processed + " รายการ; เหลือยังไม่ประมวลผล " + remaining + " รายการ (กด Run ซ้ำจนเหลือ 0)");
  });
}

function run05_retryImageErrors() {
  withLock(function () {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    CONFIG.rounds.forEach(function (name) {
      const sheet = requiredSheet(ss, name);
      const table = readTable(sheet);
      table.rows.forEach(function (row) {
        if (["ERROR", "NO_FOLDER", "NO_PUBLIC_IMAGES"].indexOf(str(row.data.image_status)) !== -1) {
          sheet.getRange(row.number, column(table, "image_status")).clearContent();
        }
      });
    });
    console.log("รีเซ็ตสถานะที่ไม่มีรูป/ผิดพลาดแล้ว ให้รัน run04 อีกครั้งหลังแก้ลิงก์หรือสิทธิ์");
  });
}

function run06_previewPublicData() {
  const result = publicDirectory();
  console.log(JSON.stringify({ publishedBusinesses: result.rows.length, withImages: result.rows.filter(function (r) { return r.images.length; }).length }));
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== "all") return jsonResponse({ error: "Unsupported action; use action=all" });
  try {
    // all คือทั้งหมดที่อนุมัติ ไม่ใช่ dump คอลัมน์ดิบ/เอกสารส่วนตัวอีกต่อไป
    return jsonResponse({ sheets: [publicDirectory()] });
  } catch (error) {
    console.error(error.message);
    return jsonResponse({ error: "ไม่สามารถอ่านข้อมูล Directory ได้ กรุณาตรวจการตั้งค่ากับผู้ดูแล" });
  }
}

function publicDirectory() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const merged = new Map();
  CONFIG.rounds.forEach(function (round) {
    readTable(requiredSheet(ss, round)).rows.forEach(function (row) {
      if (!businessName(row, round) || !isTrue(row.data.published)) return;
      const item = normalizePublicRow(row, round);
      if (!item.record_id) throw new Error("รายการเผยแพร่ไม่มี record_id");
      const previous = merged.get(item.record_id);
      if (!previous) { merged.set(item.record_id, item); return; }
      const categories = Array.from(new Set(previous.categories.concat(item.categories)));
      const images = item.images.length ? item.images : previous.images;
      Object.keys(item).forEach(function (key) {
        if (typeof item[key] === "string" && item[key]) previous[key] = item[key];
      });
      previous.categories = categories;
      previous.display_category = categories.join(" / ");
      previous.images = images;
    });
  });
  return { name: "Directory", gid: 0, rows: Array.from(merged.values()) };
}

function normalizePublicRow(row, round) {
  const d = row.data;
  const second = round === CONFIG.rounds[1];
  const category = str(d[second ? "1. ประเภทธุรกิจ / บริการหลัก" : "ประเภทธุรกิจ"]);
  const contact = str(d[second ? "7. อีเมล / เว็บไซต์ / เพจ ของกิจการ" : "LINE ID หรือ อีเมล"]);
  const email = contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  let images = [];
  try {
    const parsed = JSON.parse(str(d.images_json) || "[]");
    if (Array.isArray(parsed)) images = parsed.filter(function (image) {
      return image && /^[\w-]+$/.test(str(image.id)) && /^image\//.test(str(image.mimeType));
    }).map(function (image) { return { id: str(image.id), name: str(image.name), mimeType: str(image.mimeType) }; }).slice(0, CONFIG.imageLimit);
  } catch (_) { /* รูป cache เสียไม่ทำให้รายชื่อทั้งเว็บล่ม */ }
  return {
    record_id: str(d.record_id),
    name_th: businessName(row, round),
    name_en: second ? str(d["2b. ชื่อกิจการ / ชื่อบุคคล (English)"]) : "",
    display_category: category,
    categories: category ? [category] : [],
    location_zone: second ? str(d["3a. ที่ตั้งกิจการ"]) : "",
    service_area: second ? str(d["3b. พื้นที่ที่ให้บริการได้ (เลือกได้หลายข้อ)"]) : "",
    phone_main: str(d[second ? "5. เบอร์ติดต่อหลัก" : "เบอร์โทรศัพท์"]),
    email: email ? email[0] : "",
    email_web: contact,
    website: extractUrl(second ? contact : ""),
    portfolio_link: second ? extractUrl(d["P4. ลิงก์พอร์ตโฟลิโอ / Showreel"]) || extractUrl(d["13. ลิงก์รูปภาพ / พอร์ตโฟลิโอ / แผ่นพับประชาสัมพันธ์"]) : "",
    description: second ? str(d["ความสามารถในการรองรับ"]) : str(d["บริการที่กิจการของให้ได้"]),
    languages: second ? str(d["8. ภาษาที่ทีมสื่อสารได้"]) : "",
    availability: second ? str(d["9. ความพร้อมนอกเวลาปกติ"]) : "",
    lead_time: second ? str(d["10. ต้องแจ้งล่วงหน้าอย่างน้อย"]) : "",
    payment: second ? str(d["11. การชำระเงิน"]) : "",
    film_experience: str(d[second ? "12. เคยให้บริการกองถ่ายมาก่อนหรือไม่" : "กิจการของเคยให้บริการกองถ่ายหรือไม่"]),
    hotel_rooms: second ? str(d["H1. จำนวนห้องพักทั้งหมด"]) : "",
    hotel_star: second ? str(d["H2. ระดับ"]) : "",
    cater_cuisine: second ? str(d["F2. ประเภทอาหาร"]) : "",
    published: "TRUE",
    images: images,
  };
}

function extractUrl(value) {
  const raw = str(value);
  const match = raw.match(/https?:\/\/[^\s<>]+|www\.[^\s<>]+/i);
  const candidate = match ? match[0].replace(/[,;]+$/, "") : /^[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(raw) ? raw : "";
  return candidate ? (/^https?:\/\//i.test(candidate) ? candidate : "https://" + candidate) : "";
}

function requiredSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("ไม่พบแท็บ " + name);
  return sheet;
}

function readTable(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(function (v) { return str(v); });
  const nonempty = headers.filter(Boolean);
  if (new Set(nonempty).size !== nonempty.length) throw new Error("หัวคอลัมน์ซ้ำในแท็บ " + sheet.getName());
  return {
    headers: headers,
    rows: values.slice(1).map(function (values, index) {
      const data = {};
      headers.forEach(function (header, i) { if (header) data[header] = values[i] || ""; });
      return { number: index + 2, data: data };
    }),
  };
}

function ensureColumns(sheet, requested) {
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getDisplayValues()[0].map(str);
  requested.forEach(function (name) {
    if (headers.indexOf(name) === -1) {
      headers.push(name);
      if (headers.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
      sheet.getRange(1, headers.length).setValue(name);
    }
  });
}

function column(table, name) {
  const index = table.headers.indexOf(name);
  if (index === -1) throw new Error("ไม่พบคอลัมน์ " + name + "; รัน run01 ก่อน");
  return index + 1;
}

function setIfBlank(sheet, table, row, key, value) {
  if (!str(row.data[key])) sheet.getRange(row.number, column(table, key)).setValue(value);
}

function assertSourceIds(rows) {
  const seen = new Set();
  rows.forEach(function (row) {
    const id = str(row.data.source_id);
    if (!id || seen.has(id)) throw new Error("source_id ว่าง/ซ้ำ กรุณารัน run01 และตรวจ IDs ก่อน");
    seen.add(id);
  });
}

function businessName(row, round) {
  return str(row.data[round === CONFIG.rounds[0] ? "ชื่อกิจการ / ร้าน / บริษัท" : "2. ชื่อกิจการ / ชื่อบุคคล (ภาษาไทย)"]);
}

function names(row, round) {
  return [businessName(row, round), round === CONFIG.rounds[1] ? str(row.data["2b. ชื่อกิจการ / ชื่อบุคคล (English)"]) : ""].filter(Boolean).map(function (v) {
    return v.toLowerCase().replace(/[\s\u200b-\u200d]/g, "");
  });
}

function str(value) { return value == null ? "" : String(value).trim(); }
function isTrue(value) { return str(value).toUpperCase() === "TRUE"; }
function jsonResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function withLock(work) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error("มีฟังก์ชันอื่นกำลังทำงาน กรุณารอแล้วลองใหม่");
  try { work(); } finally { lock.releaseLock(); }
}
