const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Sheet {
  constructor(name, values) { this.name = name; this.values = values; }
  getName() { return this.name; }
  getLastColumn() { return Math.max(...this.values.map(r => r.length)); }
  getMaxColumns() { return 100; }
  setFrozenRows() {}
  autoResizeColumns() {}
  getDataRange() { return this.getRange(1, 1, this.values.length, this.getLastColumn()); }
  getRange(row, col, rows = 1, cols = 1) {
    const sheet = this;
    return {
      getDisplayValues() { return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => String(sheet.values[row - 1 + r]?.[col - 1 + c] ?? ""))); },
      setValues(values) { values.forEach((cells, r) => { sheet.values[row - 1 + r] ??= []; cells.forEach((v, c) => sheet.values[row - 1 + r][col - 1 + c] = v); }); },
      setValue(value) { this.setValues([[value]]); },
      clearContent() { this.setValue(""); },
      insertCheckboxes() { this.setValues(Array.from({ length: rows }, () => [false])); },
    };
  }
}
const sheets = new Map([
  ["รอบ 1", new Sheet("รอบ 1", [["ชื่อกิจการ / ร้าน / บริษัท", "ประเภทธุรกิจ", "เบอร์โทรศัพท์", "บริการที่กิจการของให้ได้", "หมายเหตุ"], ["Demo Hotel", "ที่พัก", "0123456789", "Old description", "PRIVATE NOTE"], ["", "", "", "", "#REF!"]])],
  ["รอบ 2", new Sheet("รอบ 2", [["2. ชื่อกิจการ / ชื่อบุคคล (ภาษาไทย)", "2b. ชื่อกิจการ / ชื่อบุคคล (English)", "1. ประเภทธุรกิจ / บริการหลัก", "5. เบอร์ติดต่อหลัก", "ความสามารถในการรองรับ"], ["โรงแรมเดโม่", "Demo Hotel", "สถานที่ถ่ายทำ", "", ""], ["กิจการใหม่", "New business", "อาหาร", "0987654321", "New description"]])],
]);
const ss = { getSheetByName: name => sheets.get(name), insertSheet: name => { const sheet = new Sheet(name, [[]]); sheets.set(name, sheet); return sheet; } };
let counter = 0;
const context = {
  console: { log() {}, warn() {}, error() {} },
  SpreadsheetApp: { openById: () => ss },
  Utilities: { getUuid: () => `uuid-${++counter}` },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("gas/Code.gs", "utf8"), context);
const call = source => vm.runInContext(source, context);
const rowValue = (name, row, key) => { const s = sheets.get(name); return s.values[row - 1][s.values[0].indexOf(key)]; };
const set = (name, row, key, value) => { const s = sheets.get(name); s.values[row - 1][s.values[0].indexOf(key)] = value; };

call("run01_prepareSheets()");
const source = rowValue("รอบ 1", 2, "source_id");
assert.equal(rowValue("รอบ 1", 2, "published"), "FALSE");
call("run01_prepareSheets()");
assert.equal(rowValue("รอบ 1", 2, "source_id"), source, "prepare must preserve IDs");
assert.equal(rowValue("รอบ 1", 2, "หมายเหตุ"), "PRIVATE NOTE");
assert.equal(rowValue("รอบ 1", 3, "source_id"), undefined, "invalid row must not get ID");
call("run02_createMatchReview()");
assert.equal(rowValue("ตรวจจับคู่", 2, "approved"), false);
assert.equal(rowValue("ตรวจจับคู่", 2, "round1_source_id"), source);
assert.throws(() => call("run02_createMatchReview()"), /มีแท็บ/);
set("ตรวจจับคู่", 2, "approved", true);
call("run03_applyApprovedMatches()");
call("run03_applyApprovedMatches()");
assert.equal(rowValue("รอบ 2", 2, "record_id"), rowValue("รอบ 1", 2, "record_id"));
assert.notEqual(rowValue("รอบ 2", 3, "record_id"), rowValue("รอบ 1", 2, "record_id"));
assert.equal(call("publicDirectory().rows.length"), 0, "default must not publish");
set("รอบ 1", 2, "published", "TRUE");
set("รอบ 2", 2, "published", "TRUE");
set("รอบ 2", 3, "published", "TRUE");
const result = JSON.parse(call("JSON.stringify(publicDirectory())"));
assert.equal(result.rows.length, 2, "matching rows merge; round2-only added");
assert.equal(result.rows[0].phone_main, "0123456789", "empty round2 must not overwrite phone");
assert.equal(result.rows[0].description, "Old description");
assert.deepEqual(result.rows[0].categories, ["ที่พัก", "สถานที่ถ่ายทำ"]);
assert(!JSON.stringify(result).includes("PRIVATE NOTE"));
set("รอบ 2", 2, "published", "FALSE");
assert.equal(call("publicDirectory().rows[0].name_th"), "Demo Hotel", "unpublished details must not leak");
console.log("PASS: prepare is idempotent, matching requires approval, publication filters, merge and privacy rules");
