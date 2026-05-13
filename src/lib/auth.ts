const CENTRAL_AUTH_URL = 'https://script.google.com/macros/s/AKfycbyXT1akJRjdPrEXolJ1oLB3wgbKF5JabRnqmTcZvX0phiZyqeao6NEpQnyreaUGoM1O/exec';
const TIMEOUT_MS = 30_000;

async function request(payload: Record<string, unknown>) {
  if (!CENTRAL_AUTH_URL.startsWith('https://script.google.com/')) {
    throw new Error('Central Auth URL is not configured. Ask the developer to hardcode the central auth Web App URL.');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(CENTRAL_AUTH_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      signal: controller.signal,
    });
    const parsed = JSON.parse(await response.text());
    if (parsed.status !== 'success') throw new Error(parsed.message || 'Auth request failed');
    return parsed as { status: 'success'; sheetUrl?: string; message?: string };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function signupCentral(username: string, password: string, email: string, sheetUrl: string) {
  await request({ action: 'signup', username, password, email, sheetUrl });
}

export async function loginCentral(username: string, password: string) {
  const result = await request({ action: 'login', username, password });
  if (!result.sheetUrl) throw new Error('No personal sheet URL found for this user');
  return result.sheetUrl;
}

export async function forgotPasswordCentral(username: string, email: string) {
  await request({ action: 'forgotPassword', username, email });
}

export const CENTRAL_AUTH_SCRIPT = `// SpacedMind Central Auth Backend v1
// Sheet: SpacedMindUsers
// Columns: username | passwordHash | email | sheetUrl | createdAt

var USER_SHEET = "SpacedMindUsers";

function userSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(USER_SHEET);
  if (!s) {
    s = ss.insertSheet(USER_SHEET);
    s.getRange(1, 1, 1, 5).setValues([["username", "passwordHash", "email", "sheetUrl", "createdAt"]]);
    s.getRange(1, 1, 1, 5).setFontWeight("bold");
    s.setFrozenRows(1);
    s.setColumnWidth(4, 420);
  }
  return s;
}

function ok(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function hashPassword(password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password));
  return bytes.map(function(byte) {
    var value = (byte + 256) % 256;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function findUserRow(sheet, username) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) return i + 1;
  }
  return -1;
}

function doGet() {
  return ok({ status: "success", message: "Central auth is running" });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var s = userSheet();
    var action = p.action;

    if (action === "signup") {
      var username = String(p.username || "").trim();
      var password = String(p.password || "");
      var email = String(p.email || "").trim().toLowerCase();
      var sheetUrl = String(p.sheetUrl || "").trim();

      if (!username || !password || !email || !sheetUrl) return ok({ status: "error", message: "Missing required fields" });
      if (findUserRow(s, username) > 0) return ok({ status: "error", message: "Username already exists" });
      if (sheetUrl.indexOf("https://script.google.com/") !== 0) return ok({ status: "error", message: "Invalid personal sheet Web App URL" });

      s.appendRow([username, hashPassword(password), email, sheetUrl, new Date().toISOString()]);
      return ok({ status: "success" });
    }

    if (action === "login") {
      var username2 = String(p.username || "").trim();
      var password2 = String(p.password || "");
      var row = findUserRow(s, username2);
      if (row <= 0) return ok({ status: "error", message: "Invalid username or password" });

      var storedHash = String(s.getRange(row, 2).getValue());
      if (storedHash !== hashPassword(password2)) return ok({ status: "error", message: "Invalid username or password" });

      return ok({ status: "success", sheetUrl: String(s.getRange(row, 4).getValue()) });
    }

    if (action === "forgotPassword") {
      var username3 = String(p.username || "").trim();
      var email3 = String(p.email || "").trim().toLowerCase();
      var row3 = findUserRow(s, username3);
      if (row3 <= 0) return ok({ status: "error", message: "No matching user found" });

      var storedEmail = String(s.getRange(row3, 3).getValue()).trim().toLowerCase();
      if (storedEmail !== email3) return ok({ status: "error", message: "Email does not match this username" });

      var tempPassword = Utilities.getUuid().slice(0, 8);
      s.getRange(row3, 2).setValue(hashPassword(tempPassword));
      MailApp.sendEmail(email3, "SpacedMind temporary password", "Your temporary password is: " + tempPassword + "\n\nPlease log in and keep it safe.");
      return ok({ status: "success" });
    }

    return ok({ status: "error", message: "Unknown action" });
  } catch (err) {
    return ok({ status: "error", message: String(err) });
  }
}`;