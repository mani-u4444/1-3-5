/**
 * Google Apps Script — StudyPrep Backend
 * ======================================
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire file, then click Deploy → New Deployment
 * 4. Choose "Web App", execute as "Me", access "Anyone"
 * 5. Copy the deployment URL and paste it into the StudyPrep settings
 */

const SHEET_NAME = "Concepts";
const HEADERS = ["id", "title", "description", "learnedDate", "recapDay3Done", "recapDay7Done"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  try {
    const action = e.parameter.action;
    const sheet = getSheet_();

    if (action === "getAll") {
      return getAll_(sheet);
    } else if (action === "add") {
      const title = e.parameter.title;
      const description = e.parameter.description || "";
      const learnedDate = e.parameter.learnedDate;
      return add_(sheet, title, description, learnedDate);
    } else if (action === "update") {
      const id = e.parameter.id;
      const field = e.parameter.field; // "recapDay3Done" or "recapDay7Done"
      const value = e.parameter.value; // "true" or "false"
      return update_(sheet, id, field, value);
    } else if (action === "delete") {
      const id = e.parameter.id;
      return delete_(sheet, id);
    } else {
      return jsonResponse_({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse_({ error: err.toString() }, 500);
  }
}

function getAll_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse_([]);

  const rows = data.slice(1);
  const concepts = rows.map(row => ({
    id: String(row[0]),
    title: String(row[1]),
    description: String(row[2]),
    learnedDate: String(row[3]),
    recapDay3Done: String(row[4]) === "true",
    recapDay7Done: String(row[5]) === "true",
  }));
  return jsonResponse_(concepts);
}

function add_(sheet, title, description, learnedDate) {
  const id = Utilities.getUuid();
  sheet.appendRow([id, title, description, learnedDate, false, false]);
  SpreadsheetApp.flush();
  const concept = {
    id,
    title,
    description,
    learnedDate,
    recapDay3Done: false,
    recapDay7Done: false,
  };
  return jsonResponse_(concept);
}

function update_(sheet, id, field, value) {
  const data = sheet.getDataRange().getValues();
  const colIndex = HEADERS.indexOf(field);
  if (colIndex === -1) return jsonResponse_({ error: "Invalid field" }, 400);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, colIndex + 1).setValue(value === "true");
      SpreadsheetApp.flush();
      return jsonResponse_({ success: true, id, field, value: value === "true" });
    }
  }
  return jsonResponse_({ error: "Concept not found" }, 404);
}

function delete_(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return jsonResponse_({ success: true, id });
    }
  }
  return jsonResponse_({ error: "Concept not found" }, 404);
}

function jsonResponse_(data, code) {
  const out = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  if (code) out.setStatus(code);
  return out;
}
