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
  return (parsed.data as Record<string, unknown>[]).map(row => {
    let images: ImageAttachment[] = [];
    if (Array.isArray(row.images)) images = row.images as ImageAttachment[];
    else {
      try { images = JSON.parse(String(row.images ?? '[]')) as ImageAttachment[]; } catch { images = []; }
    }
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? row.text ?? ''),
      notes: String(row.notes ?? ''),
      images,
      dateAdded: String(row.dateAdded ?? ''),
      reviewedDay3: row.reviewedDay3 === true || row.reviewedDay3 === 'TRUE' || row.reviewedDay3 === 'true',
      reviewedDay7: row.reviewedDay7 === true || row.reviewedDay7 === 'TRUE' || row.reviewedDay7 === 'true',
    };
  }).filter(item => item.id);
}

export const addOne = (concept: Concept) => post({ action: 'add', ...concept, images: concept.images ?? [] });
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
  return post({ action: 'edit', id, title, notes, images, dateAdded, reviewedDay3, reviewedDay7 });
}

export const APPS_SCRIPT = `// SpacedMind Google Sheets Backend v6
// Concepts: id | title | notes | imageCount | dateAdded | reviewedDay3 | reviewedDay7
// Images are stored as chunked rows in the SpacedMindImages tab.

var SHEET = "SpacedMind";
var IMAGE_SHEET = "SpacedMindImages";
var CHUNK_SIZE = 45000;

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.insertSheet(SHEET);
    s.getRange(1,1,1,7).setValues([["id","title","notes","imageCount","dateAdded","reviewedDay3","reviewedDay7"]]);
    s.getRange(1,1,1,7).setFontWeight("bold");
    s.setFrozenRows(1);
    s.setColumnWidth(3, 420);
  }
  return s;
}

function imageSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(IMAGE_SHEET);
  if (!s) {
    s = ss.insertSheet(IMAGE_SHEET);
    s.getRange(1,1,1,5).setValues([["conceptId","imageId","name","chunkIndex","chunk"]]);
    s.getRange(1,1,1,5).setFontWeight("bold");
    s.setFrozenRows(1);
    s.setColumnWidth(5, 420);
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

function normalImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(String(raw)); } catch (e) { return []; }
}

function replaceImages(conceptId, rawImages) {
  var s = imageSheet();
  var last = s.getLastRow();
  if (last > 1) {
    var data = s.getRange(2,1,last-1,1).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(conceptId)) s.deleteRow(i + 2);
    }
  }
  var images = normalImages(rawImages);
  var rows = [];
  for (var a = 0; a < images.length; a++) {
    var img = images[a] || {};
    var dataUrl = String(img.dataUrl || "");
    var imageId = String(img.id || Utilities.getUuid());
    var name = String(img.name || "image");
    for (var start = 0, idx = 0; start < dataUrl.length; start += CHUNK_SIZE, idx++) {
      rows.push([String(conceptId), imageId, name, idx, dataUrl.slice(start, start + CHUNK_SIZE)]);
    }
  }
  if (rows.length) s.getRange(s.getLastRow()+1,1,rows.length,5).setValues(rows);
  return images.length;
}

function readImagesByConcept() {
  var s = imageSheet();
  var last = s.getLastRow();
  var map = {};
  if (last <= 1) return map;
  var rows = s.getRange(2,1,last-1,5).getValues();
  var grouped = {};
  for (var i = 0; i < rows.length; i++) {
    var conceptId = String(rows[i][0]);
    var imageId = String(rows[i][1]);
    var key = conceptId + "::" + imageId;
    if (!grouped[key]) grouped[key] = { conceptId: conceptId, id: imageId, name: String(rows[i][2]), chunks: [] };
    grouped[key].chunks[Number(rows[i][3])] = String(rows[i][4]);
  }
  for (var k in grouped) {
    var img = grouped[k];
    if (!map[img.conceptId]) map[img.conceptId] = [];
    map[img.conceptId].push({ id: img.id, name: img.name, dataUrl: img.chunks.join("") });
  }
  return map;
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === "ping") return ok({status:"success"});
  if (action === "getAll") {
    var s = sheet();
    var data = s.getDataRange().getValues();
    var headers = data[0];
    var imageMap = readImagesByConcept();
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        var value = data[i][j];
        row[headers[j]] = typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value);
      }
      row.images = imageMap[String(row.id)] || [];
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
      var imageCount = replaceImages(p.id, p.images);
      s.appendRow([String(p.id), String(p.title || ""), String(p.notes || ""), imageCount, String(p.dateAdded || ""), p.reviewedDay3 ? true : false, p.reviewedDay7 ? true : false]);
      return ok({status:"success"});
    }
    if (p.action === "edit") {
      var r = findRow(s, p.id);
      var count = replaceImages(p.id, p.images);
      if (r > 0) {
        s.getRange(r,2).setValue(String(p.title || ""));
        s.getRange(r,3).setValue(String(p.notes || ""));
        s.getRange(r,4).setValue(count);
        s.getRange(r,5).setValue(String(p.dateAdded || ""));
        s.getRange(r,6).setValue(p.reviewedDay3 ? true : false);
        s.getRange(r,7).setValue(p.reviewedDay7 ? true : false);
      }
      return ok({status:"success"});
    }
    if (p.action === "delete") {
      replaceImages(p.id, []);
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
      var is = imageSheet();
      var ilast = is.getLastRow();
      if (ilast > 1) is.deleteRows(2, ilast - 1);
      return ok({status:"success"});
    }
    return ok({status:"error", message:"Unknown action"});
  } catch (err) {
    return ok({status:"error", message:String(err)});
  }
}`;