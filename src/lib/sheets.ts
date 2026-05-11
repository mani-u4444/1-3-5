import type { Concept, ImageAttachment } from './types';

const URL_KEY = 'spacedmind-script-url';
const TIMEOUT_MS = 30_000;

export const getUrl = () => localStorage.getItem(URL_KEY) ?? '';
export const setUrl = (url: string) => localStorage.setItem(URL_KEY, url.trim());
export const clearUrl = () => localStorage.removeItem(URL_KEY);
export const isConfigured = () => getUrl().startsWith('https://script.google.com/');

async function request(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    window.clearTimeout(timer);
  }
}

async function post(payload: Record<string, unknown>) {
  const url = getUrl();
  if (!url) throw new Error('Google Sheets is not configured');
  const response = await request(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });
  const text = await response.text();
  if (text) {
    const parsed = JSON.parse(text);
    if (parsed.status !== 'success') throw new Error(parsed.message || 'Google Sheets request failed');
  }
}

export async function ping() {
  try {
    const response = await request(`${getUrl()}?action=ping`, { method: 'GET' });
    const parsed = JSON.parse(await response.text());
    return parsed.status === 'success';
  } catch {
    return false;
  }
}

export async function fetchAll(): Promise<Concept[]> {
  const response = await request(`${getUrl()}?action=getAll`, { method: 'GET' });
  const parsed = JSON.parse(await response.text());
  if (parsed.status !== 'success') throw new Error(parsed.message || 'Could not load Google Sheets');
  return (parsed.data as Record<string, unknown>[]).map(row => ({
    id: String(row.id ?? ''),
    title: String(row.title ?? row.text ?? ''),
    notes: String(row.notes ?? ''),
    images: (() => { try { return JSON.parse(String(row.images ?? '[]')) as ImageAttachment[]; } catch { return []; } })(),
    dateAdded: String(row.dateAdded ?? ''),
    reviewedDay3: row.reviewedDay3 === true || row.reviewedDay3 === 'TRUE' || row.reviewedDay3 === 'true',
    reviewedDay7: row.reviewedDay7 === true || row.reviewedDay7 === 'TRUE' || row.reviewedDay7 === 'true',
  })).filter(item => item.id);
}

export const addOne = (concept: Concept) => post({ action: 'add', ...concept, images: JSON.stringify(concept.images ?? []) });
export const deleteOne = (id: string) => post({ action: 'delete', id });
export const markReview = (id: string, day: 3 | 7) => post({ action: 'updateRecap', id, day });
export const clearAll = () => post({ action: 'clearAll' });

export function editOne(
  id: string,
  title: string,
  notes: string,
  images: ImageAttachment[],
  dateAdded: string,
  reviewedDay3: boolean,
  reviewedDay7: boolean,
) {
  return post({ action: 'edit', id, title, notes, images: JSON.stringify(images), dateAdded, reviewedDay3, reviewedDay7 });
}

export const APPS_SCRIPT = `// SpacedMind Google Sheets Backend v5
// Columns: id | title | notes | images | dateAdded | reviewedDay3 | reviewedDay7

var SHEET = "SpacedMind";

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.insertSheet(SHEET);
    s.getRange(1,1,1,7).setValues([["id","title","notes","images","dateAdded","reviewedDay3","reviewedDay7"]]);
    s.getRange(1,1,1,7).setFontWeight("bold");
    s.setFrozenRows(1);
    s.setColumnWidth(3, 420);
    s.setColumnWidth(4, 220);
  } else {
    var headers = s.getRange(1,1,1,Math.max(7, s.getLastColumn())).getValues()[0];
    if (headers[3] !== "images") {
      s.insertColumnAfter(3);
      s.getRange(1,4).setValue("images");
      s.setColumnWidth(4, 220);
    }
  }
  return s;
}

function findRow(s, id) {
  var data = s.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === String(id)) return i + 1;
  return -1;
}

function ok(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === "ping") return ok({status:"success"});
  if (action === "getAll") {
    var s = sheet();
    var data = s.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        var value = data[i][j];
        row[headers[j]] = typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value);
      }
      rows.push(row);
    }
    return ok({status:"success", data: rows});
  }
  return ok({status:"error", message:"Unknown action"});
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var s = sheet();
    if (p.action === "add") {
      s.appendRow([String(p.id), String(p.title || ""), String(p.notes || ""), String(p.images || "[]"), String(p.dateAdded || ""), p.reviewedDay3 ? true : false, p.reviewedDay7 ? true : false]);
      return ok({status:"success"});
    }
    if (p.action === "edit") {
      var r = findRow(s, p.id);
      if (r > 0) {
        s.getRange(r,2).setValue(String(p.title || ""));
        s.getRange(r,3).setValue(String(p.notes || ""));
        s.getRange(r,4).setValue(String(p.images || "[]"));
        s.getRange(r,5).setValue(String(p.dateAdded || ""));
        s.getRange(r,6).setValue(p.reviewedDay3 ? true : false);
        s.getRange(r,7).setValue(p.reviewedDay7 ? true : false);
      }
      return ok({status:"success"});
    }
    if (p.action === "delete") {
      var rd = findRow(s, p.id);
      if (rd > 0) s.deleteRow(rd);
      return ok({status:"success"});
    }
    if (p.action === "updateRecap") {
      var rr = findRow(s, p.id);
      if (rr > 0) {
        if (p.day === 3) s.getRange(rr,6).setValue(true);
        if (p.day === 7) s.getRange(rr,7).setValue(true);
      }
      return ok({status:"success"});
    }
    if (p.action === "clearAll") {
      var last = s.getLastRow();
      if (last > 1) s.deleteRows(2, last - 1);
      return ok({status:"success"});
    }
    return ok({status:"error", message:"Unknown action"});
  } catch (err) {
    return ok({status:"error", message:String(err)});
  }
}`;