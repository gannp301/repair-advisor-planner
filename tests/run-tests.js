/* Browser tests for Repair Advisor Planner v1.3.
   All customers and folder numbers are fictional.

   Setup (once):   cd tests && npm install && npx playwright install chromium
   Run:            node tests/run-tests.js            (from the repo root)

   The real Tesseract.js reader is used for the screenshot tests. Its
   files come from tests/node_modules instead of jsDelivr: the browser's
   requests to the CDN are answered locally, so the tests run offline and
   also prove the pinned file and SRI hash in index.html match. */
"use strict";
const path = require("path");
const fs = require("fs");
let playwright;
try { playwright = require("playwright"); } catch (e) { playwright = require(path.join(__dirname, "node_modules", "playwright")); }
const { chromium } = playwright;

const APP = "file://" + path.resolve(__dirname, "..", "index.html");
const NM = process.env.TESSERACT_MODULES || path.join(__dirname, "node_modules");
const MONDAY = new Date("2026-11-02T10:00:00");   // tests run "on" Monday, Nov 2, 2026
const OUT = process.env.TEST_OUTPUT || path.join(__dirname, "output");
fs.mkdirSync(OUT, { recursive: true });

let failures = 0, passes = 0, current = "";
function check(name, cond, detail) {
  if (cond) { passes++; console.log("  ok   " + name); }
  else { failures++; console.log("  FAIL " + name + (detail !== undefined ? "  -> " + JSON.stringify(detail).slice(0, 400) : "")); }
}
function section(name) { current = name; console.log("\n# " + name); }

const KEYS = {
  tasks: "repairAdvisorPlanner.tasks.v1",
  notebook: "repairAdvisorPlanner.notebook.v1",
  settings: "repairAdvisorPlanner.settings.v1",
  schema: "repairAdvisorPlanner.schemaVersion",
  preV13: "repairAdvisorPlanner.tasks.v1.beforeV1_3",
  imports: "repairAdvisorPlanner.imports.v1",
  undo: "repairAdvisorPlanner.beforeRestore"
};

function task(id, folder, customer, desc, category, extra) {
  return Object.assign({ id, customer, folder, desc, category, estimator: "", createdAt: "2026-10-30T15:00:00.000Z", done: false, completedAt: null, example: false }, extra || {});
}
const BASE_TASKS = [
  task("t-bracket", "10452", "Jones", "Verify bumper bracket was ordered", "Parts"),
  task("t-rental", "10452", "Jones", "Call customer about rental", "Customer"),
  task("t-garcia", "10600", "Garcia", "Check parts", "Parts"),
  task("t-lee", "10777", "Lee", "Submit supplement for hidden frame damage", "Supplements")
];

async function routeOcr(page) {
  await page.route(/cdn\.jsdelivr\.net/, (route) => {
    const u = route.request().url();
    let f = null;
    if (/tesseract\.js@5\.1\.1\/dist\/tesseract\.min\.js$/.test(u)) f = NM + "/tesseract.js/dist/tesseract.min.js";
    else if (/tesseract\.js@5\.1\.1\/dist\/worker\.min\.js$/.test(u)) f = NM + "/tesseract.js/dist/worker.min.js";
    else if (/tesseract\.js-core@5\.1\.1\//.test(u)) f = NM + "/tesseract.js-core/" + u.split("/").pop();
    else if (/@tesseract\.js-data\/eng@1\.0\.0\/4\.0\.0_best_int\/eng\.traineddata\.gz$/.test(u)) f = NM + "/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz";
    if (!f || !fs.existsSync(f)) { console.log("  (unrouted CDN request: " + u + ")"); return route.abort(); }
    route.fulfill({ body: fs.readFileSync(f), headers: { "access-control-allow-origin": "*", "content-type": /\.js$/.test(f) ? "text/javascript" : "application/octet-stream" } });
  });
}

// Opens the app with optional starting localStorage (applied once, survives reloads).
async function open(browser, seed, opts) {
  opts = opts || {};
  const context = await browser.newContext(Object.assign({ acceptDownloads: true }, opts.context || {}));
  const page = await context.newPage();
  await page.clock.setFixedTime(opts.now || MONDAY);
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  await routeOcr(page);
  await page.goto(APP);
  await page.evaluate((s) => {
    localStorage.clear();
    Object.keys(s || {}).forEach((k) => localStorage.setItem(k, typeof s[k] === "string" ? s[k] : JSON.stringify(s[k])));
  }, seed || {});
  await page.reload();
  return page;
}

function v13Seed(extra) {
  return Object.assign({ [KEYS.schema]: "3", [KEYS.tasks]: BASE_TASKS, [KEYS.notebook]: { version: 1, days: {} } }, extra || {});
}

const store = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const lineTexts = (page) => page.$$eval("#pageLines .line .words", (els) => els.map((e) => e.textContent));
const cards = (page) => page.$$eval("#reviewList .rv", (els) => els.map((e) => ({
  i: e.getAttribute("data-i"),
  head: e.querySelector(".rv-head").textContent,
  text: e.querySelector('[data-f="text"]').value,
  kind: e.querySelector('[data-f="kind"]').value,
  action: e.querySelector('[data-f="action"]').value,
  approved: e.querySelector('[data-d="approve"]').getAttribute("aria-pressed") === "true",
  cls: e.className,
  chosen: (e.querySelector('input[data-f="task"]:checked') || {}).value || "",
  matchText: (e.querySelector(".rv-match") || {}).textContent || "",
  notes: (e.querySelector(".rv-notes") || {}).textContent || "",
  hasCrop: !!e.querySelector(".rv-crop")
})));
const card = (list, re) => list.find((c) => re.test(c.text));
async function pasteImport(page, text, date) {
  if (date) await page.fill("#importDate", date);
  await page.fill("#notesInput", text);
  await page.click("#readNotesBtn");
  await page.waitForSelector("#reviewPanel:not([hidden])");
}
async function decide(page, i, d) { await page.click('.rv[data-i="' + i + '"] [data-d="' + d + '"]'); }
async function apply(page) { await page.click("#applyNotesBtn"); await page.waitForSelector("#reviewPanel[hidden]", { state: "attached" }); }
const findTaskIn = (list, id) => list.find((t) => t.id === id);

// A fictional notes screenshot, rendered by the browser itself.
async function notesScreenshot(browser, lines, opts) {
  opts = opts || {};
  const p = await browser.newPage({ deviceScaleFactor: opts.scale || 2 });
  const html = '<html><body style="margin:0;background:' + (opts.bg || "#fff") + ";color:" + (opts.fg || "#111") +
    ';font:20px -apple-system,Helvetica,Arial,sans-serif;padding:24px;width:720px"><div style="line-height:1.8">' +
    lines.map((l) => {
      const box = l.box === "checked" ? '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#f5b400;vertical-align:-3px;margin-right:8px"></span>'
        : l.box === "empty" ? '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid #aaa;vertical-align:-3px;margin-right:8px"></span>' : "";
      const style = l.mark === "highlight" ? "background:#ffe95c" : l.mark === "strike" ? "text-decoration:line-through" : "";
      return "<div>" + box + '<span style="' + style + '">' + l.text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span></div>";
    }).join("") + "</div></body></html>";
  await p.setContent(html);
  const buf = await p.screenshot({ fullPage: true });
  await p.close();
  return buf;
}
async function imageImport(page, buffers, date) {
  if (date) await page.fill("#importDate", date);
  await page.setInputFiles("#imageFile", buffers.map((b, i) => ({ name: "notes-" + i + ".png", mimeType: "image/png", buffer: b })));
  await page.waitForSelector("#reviewPanel:not([hidden])", { timeout: 120000 });
}

(async () => {
  const browser = await chromium.launch();
  const R = (page, fn, arg) => page.evaluate(fn, arg);

  /* ------------------------------------------------------------------ */
  section("Smart reader and classifier (units)");
  {
    const page = await open(browser, v13Seed());
    const cls = (t) => R(page, (t) => window.RepairPlannerTest.classifyText(t), t);
    const k = async (t) => (await cls(t)).kind;
    check("Example A text is a follow-up", await k("10452 Jones - check bumper bracket order") === "followup");
    check("Example B text is an appointment", await k("Smith called to schedule estimate Thursday at 9:30") === "appointment");
    check("Example C text is a follow-up", await k("10518 - follow up with parts on mirror ETA") === "followup");
    check("Accident details are info", await k("Lee rear ended at light, cust states no injuries") === "reference");
    check("Insurance label is info", await k("Ins: Progressive claim 55-1234") === "reference");
    check("'called, left vm' is info, not a task", await k("Called Garcia, left vm") === "reference");
    check("Garbage OCR is uncertain", await k("~~ ;; || .. ,") === "uncertain");
    check("Single vague word is uncertain", await k("Bumper") === "uncertain");
    check("'call X to schedule <day> <time>' is not a plain appointment", await k("Call Smith to schedule estimate Thursday 9:30") !== "appointment");
    check("'done' is recognised as a completion word", (await cls("10452 bracket ordered - done")).done === true);
    check("Common words alone aren't 'done'", (await cls("10452 waiting on bracket")).done === false);

    const a = await R(page, () => window.RepairPlannerTest.analyzeLine("10452 Jones - check bumper bracket order", { knownCustomers: [], knownEstimators: [] }));
    check("Folder # extracted", a.folder === "10452", a);
    check("Name before a dash becomes the customer", a.customer === "Jones" && a.customerSource === "header", a);
    check("Task wording is cleaned", a.desc === "Check bumper bracket order", a);
    const legacy = await R(page, () => window.RepairPlannerTest.parseNotes("RO 90452 Rivera\ncall adjuster re supplement\nbumper on backorder\n\nCust: Ann Lee 90470 sublet alignment", [], { knownCustomers: [], knownEstimators: [] }, "").proposals);
    check("v1.2 reader still groups lines under a header", legacy.length === 3 && legacy[0].folder === "90452" && legacy[0].customer === "Rivera" && legacy[0].desc === "Call adjuster about supplement", legacy);
    check("v1.2 reader: label customer + sublet", legacy[2].customer === "Ann Lee" && legacy[2].folder === "90470" && legacy[2].category === "Sublet", legacy[2]);

    const ap = (t, d) => R(page, (x) => window.RepairPlannerTest.parseAppt(x[0], x[1]), [t, d]);
    let x = await ap("Smith called to schedule estimate Thursday at 9:30", "2026-11-02");
    check("Thursday -> likely date Thu Nov 5", x.date === "2026-11-05", x);
    check("9:30 without AM/PM -> 09:30, not confirmed", x.time === "09:30" && x.confirmed === false, x);
    x = await ap("Smith drop off Thursday 9:30", "2026-11-05");
    check("Same weekday as note date -> date left blank", x.date === "", x);
    x = await ap("Rivera pickup next Tuesday 2pm", "2026-11-02");
    check("'next Tuesday' -> date left blank, time kept", x.date === "" && x.time === "14:00", x);
    x = await ap("Chen estimate 11/12 at 10:15am", "2026-11-02");
    check("Explicit date and am -> confirmed", x.date === "2026-11-12" && x.time === "10:15" && x.confirmed, x);
    x = await ap("Patel drop off tomorrow at 3", "2026-11-02");
    check("'tomorrow at 3' -> Nov 3, 15:00 assumed", x.date === "2026-11-03" && x.time === "15:00" && !x.confirmed, x);
    x = await ap("Call 555-123-4567 re estimate", "2026-11-02");
    check("Phone number isn't read as a time", x.time === "", x);

    const m = (f, t) => R(page, (a) => window.RepairPlannerTest.matchTasks(a[0], a[1]), [f, t]);
    let mm = await m({ folder: "10452", customer: "Jones", category: "Parts" }, "Check bumper bracket order");
    check("Example A matches the bracket task with HIGH confidence", mm[0] && mm[0].taskId === "t-bracket" && mm[0].level === "high", mm);
    check("Same-folder unrelated task ranks lower", !mm[1] || mm[1].taskId !== "t-bracket" && mm[1].level !== "high", mm);
    mm = await m({ folder: "", customer: "", category: "Customer" }, "Call customer");
    check("'Call customer' alone matches nothing", mm.length === 0, mm);
    mm = await m({ folder: "", customer: "", category: "Parts" }, "Check parts");
    check("'Check parts' alone matches nothing", mm.length === 0, mm);
    mm = await m({ folder: "10999", customer: "", category: "Parts" }, "Verify bumper bracket was ordered");
    check("Different folder # never matches, even with same words", !mm.some((c) => c.taskId === "t-bracket"), mm);
    mm = await m({ folder: "10457", customer: "", category: "Parts" }, "Check bumper bracket order");
    check("Folder one digit off (OCR slip) is offered, not HIGH", mm[0] && mm[0].taskId === "t-bracket" && mm[0].level !== "high", mm);
    mm = await m({ folder: "10452", customer: "", category: "Other" }, "done");
    check("Folder with 2 open tasks and no words -> only LOW guesses", mm.length === 2 && mm.every((c) => c.level === "low"), mm);

    const s = (a, b) => R(page, (x) => window.RepairPlannerTest.lineSim(x[0], x[1]), [a, b]);
    check("OCR slip still counts as the same line", await s("10518 - follow up with parts on mirror ETA", "10513 follow up with parts on mirror CTA") >= 0.85);
    check("Different lines are not the same", await s("10518 - follow up with parts on mirror ETA", "10452 Jones - check bumper bracket order") < 0.7);
    const tm = await R(page, () => ["- [x] call Jones", "~~10518 mirror~~", "call Lee ✓", "[ ] call Chen"].map(window.RepairPlannerTest.textMarks));
    check("Typed [x], ~~strike~~ and ✓ are read as marks", tm[0].marks[0].mark === "check" && tm[1].marks[0].mark === "strike" && tm[2].marks[0].mark === "check" && tm[3].marks.length === 0 && tm[3].text === "call Chen", tm);
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Daily notes: writing, highlighting, completing, refresh, past days");
  {
    const page = await open(browser, v13Seed({
      [KEYS.notebook]: { version: 1, days: {
        "2026-10-29": { lines: [
          { id: "old1", text: "10600 Garcia - call about rental", at: "2026-10-29T14:00:00.000Z", block: "b1" },
          { id: "old2", text: "Garcia rear ended on I-95, cust states no injuries", at: "2026-10-29T14:01:00.000Z", block: "b1" },
          { id: "old3", text: "10777 send supplement photos", at: "2026-10-29T14:02:00.000Z", block: "b1", done: true }
        ] },
        "2026-10-30": { lines: [
          { id: "old4", text: "check 10452 bracket", at: "2026-10-30T14:00:00.000Z", block: "b2", hl: true }
        ] }
      } }
    }));
    check("Opens on Daily notes", await page.getAttribute("body", "data-view") === "notes");
    check("Page is dated Monday, November 2", /Monday, November 2/.test(await page.textContent("#pageTitle")));
    await page.fill("#noteEntry", "10452 Jones - check bumper bracket order\nSmith called to schedule estimate Thursday at 9:30");
    await page.click("#addNoteBtn");
    await page.fill("#noteEntry", "10518 - follow up with parts on mirror ETA");
    await page.keyboard.press("Control+Enter");
    let lines = await lineTexts(page);
    check("Three lines added in written order", lines.join("|") === "10452 Jones - check bumper bracket order|Smith called to schedule estimate Thursday at 9:30|10518 - follow up with parts on mirror ETA", lines);
    check("Two separate entries make two blocks", (await page.$$("#pageLines .block")).length === 2);
    check("No task was created just by writing", (await store(page, KEYS.tasks)).length === 4);

    const ids = await page.$$eval("#pageLines .line", (els) => els.map((e) => e.getAttribute("data-id")));
    await page.click('#pageLines .hlbtn[data-id="' + ids[0] + '"]');
    await page.click('#pageLines .lchk[data-id="' + ids[2] + '"]');
    let nb = await store(page, KEYS.notebook);
    let today = nb.days["2026-11-02"].lines;
    check("Highlight saved on line 1 only", today[0].hl && !today[1].hl && !today[2].hl);
    check("Check-off saved on line 3 only", today[2].done && !today[0].done);
    check("Highlighting didn't mark the line done", today[0].done === false);

    // Highlighter mode: tapping text highlights
    await page.click("#hlModeBtn");
    await page.click('#pageLines .ltext[data-id="' + ids[1] + '"]');
    await page.click("#hlModeBtn");
    nb = await store(page, KEYS.notebook);
    check("Highlighter mode highlights by tapping the text", nb.days["2026-11-02"].lines[1].hl === true);

    // Edit a line keeps the original wording
    await page.click('#pageLines .ltext[data-id="' + ids[1] + '"]');
    await page.waitForSelector("#lineSheet:not([hidden])");
    await page.fill("#lsText", "Smith called to schedule estimate Thursday at 9:30 am");
    await page.click('#lsKind [data-v="appointment"]');
    await page.fill("#lsApptDate", "2026-11-05");
    await page.fill("#lsApptTime", "09:30");
    await page.check("#lsApptOk");
    await page.click("#lsSave");
    nb = await store(page, KEYS.notebook);
    const edited = nb.days["2026-11-02"].lines[1];
    check("Edited text saved", edited.text === "Smith called to schedule estimate Thursday at 9:30 am");
    check("Original wording preserved", edited.orig === "Smith called to schedule estimate Thursday at 9:30");
    check("Appointment details saved on the note", edited.kind === "appointment" && edited.appt.date === "2026-11-05" && edited.appt.time === "09:30" && edited.appt.confirmed);

    // Hide done
    await page.check("#hideDone");
    lines = await lineTexts(page);
    check("Hide done hides checked and highlighted-as-done lines", lines.length === 0 || !lines.includes("10518 - follow up with parts on mirror ETA"), lines);
    await page.uncheck("#hideDone");
    check("Done lines come back when shown", (await lineTexts(page)).length === 3);

    // Draft survives refresh; data survives refresh
    await page.fill("#noteEntry", "half-written note about Patel");
    await page.dispatchEvent("#noteEntry", "blur");
    await page.reload();
    check("Notes still there after refresh", (await lineTexts(page)).length === 3);
    check("Unsaved draft restored after refresh", await page.inputValue("#noteEntry") === "half-written note about Patel");
    check("Highlight still there after refresh", (await page.$$("#pageLines .line.hl")).length === 2);

    // Previous days
    await page.click("#prevDayBtn");
    check("Previous workday is Friday Oct 30 (weekend skipped)", /Friday, October 30/.test(await page.textContent("#pageTitle")));
    await page.click("#prevDayBtn");
    check("Then Thursday Oct 29", /Thursday, October 29/.test(await page.textContent("#pageTitle")));
    check("Thursday shows its own 3 lines", (await lineTexts(page)).length === 3);
    await page.fill("#noteEntry", "10600 Garcia rental extended to Fri");
    await page.click("#addNoteBtn");
    nb = await store(page, KEYS.notebook);
    check("A past day can be edited (line added to Oct 29)", nb.days["2026-10-29"].lines.length === 4);
    check("Nothing copied into today's page", nb.days["2026-11-02"].lines.length === 3);

    // Unresolved
    await page.click('.tab[data-tab="open"]');
    const openText = await page.textContent("#openList");
    check("Unresolved shows the open follow-up from Oct 29", /call about rental/.test(openText), openText);
    check("Unresolved hides the done line", !/send supplement photos/.test(openText));
    check("Unresolved hides a line highlighted when highlights mean done", !/check 10452 bracket/.test(openText));
    check("Unresolved keeps accident info out of the main list", !/rear ended/.test(openText));
    check("Unresolved doesn't list today's lines", !/mirror ETA/.test(openText));
    await page.click('#openList [data-act="info"]');
    check("'Just info' removes a line from Unresolved", !/call about rental/.test(await page.textContent("#openList")));
    // Highlight meaning: important -> highlighted line becomes unresolved again
    await page.click('#hlMeaning [data-v="important"]');
    check("When highlights mean 'important', the highlighted line is unresolved", /check 10452 bracket/.test(await page.textContent("#openList")));
    await page.click('#hlMeaning [data-v="done"]');

    // Search notes and jump
    await page.click('.tab[data-tab="notes"]');
    await page.fill("#noteSearch", "rental extended");
    await page.click("#noteSearchResults button");
    check("Find in notes jumps to the right day", /Thursday, October 29/.test(await page.textContent("#pageTitle")));
    // Escaping
    await page.click("#todayBtn");
    await page.fill("#noteEntry", '<img src=x onerror="window.__xss=1"> <b>bold</b>');
    await page.click("#addNoteBtn");
    check("Note text is shown as text, not HTML", (await lineTexts(page)).some((t) => t.includes("<img src=x")) && !(await page.evaluate(() => window.__xss)));
    check("Task board still works", (await page.click('.tab[data-tab="tasks"]'), (await page.$$("#carriedList .task")).length === 4));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.screenshot({ path: path.join(OUT, "notes-desktop.png"), fullPage: true });
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Text import: Examples A, B, C, rejecting a completion");
  {
    const page = await open(browser, v13Seed());
    await pasteImport(page, "~~10452 Jones - check bumper bracket order~~\nSmith called to schedule estimate Thursday at 9:30\n10518 - follow up with parts on mirror ETA\nLee rear ended at light, cust states no injuries\nzz qx", "2026-11-02");
    let c = await cards(page);
    const A = card(c, /bumper bracket/), B = card(c, /Smith/), C = card(c, /10518/), D = card(c, /rear ended/), E = card(c, /zz qx/);
    check("A: suggested completion of the matched task", A && A.kind === "completion" && A.action === "complete", A);
    check("A: matched task is 'Verify bumper bracket was ordered' with high confidence", A && A.chosen === "t-bracket" && /High confidence/.test(A.matchText), A);
    check("A: completion is NOT pre-approved", A && !A.approved && /pending/.test(A.cls), A);
    check("A: the cross-out is shown as a mark", A && /Crossed out/.test(A.head));
    check("B: saved as appointment, not a task", B && B.kind === "appointment" && B.action === "appt" && B.approved, B);
    check("B: likely date Thu Nov 5 shown, not confirmed", (await page.inputValue('.rv[data-i="' + B.i + '"] [data-f="apptDate"]')) === "2026-11-05" && !(await page.isChecked('.rv[data-i="' + B.i + '"] [data-f="apptOk"]')));
    check("B: says nothing is booked externally", /Nothing is booked/.test(await page.textContent('.rv[data-i="' + B.i + '"]')));
    check("C: create open task, pre-approved", C && C.kind === "followup" && C.action === "task" && C.approved, C);
    check("C: folder # 10518 extracted", (await page.inputValue('.rv[data-i="' + C.i + '"] [data-f="folder"]')) === "10518");
    check("C: no due date field", !(await page.$('.rv[data-i="' + C.i + '"] [data-f="due"]')));
    check("Info line saved as info", D && D.kind === "reference" && D.action === "info");
    check("Unreadable line is uncertain and needs a decision", E && E.kind === "uncertain" && !E.approved, E);
    check("Nothing saved before Apply", (await store(page, KEYS.tasks)).every((t) => !t.done) && Object.keys((await store(page, KEYS.notebook)).days).length === 0);

    // Choose a different matching task, then reject (skip) instead.
    await page.selectOption('.rv[data-i="' + A.i + '"] [data-f="taskAny"]', "t-rental");
    check("Can choose a different task", (await cards(page)).find((x) => x.i === A.i).chosen === "t-rental");
    await page.check('.rv[data-i="' + A.i + '"] input[data-f="task"][value="t-bracket"]');
    await decide(page, A.i, "skip");
    await decide(page, E.i, "skip");
    await apply(page);
    let tasks = await store(page, KEYS.tasks);
    let nb = await store(page, KEYS.notebook);
    const day = nb.days["2026-11-02"].lines;
    check("Rejected completion: bracket task still open", !findTaskIn(tasks, "t-bracket").done);
    check("One new open task created for 10518", tasks.length === 5 && tasks.some((t) => t.folder === "10518" && !t.done && /mirror ETA/i.test(t.desc)), tasks.map((t) => t.desc));
    check("Appointment did not create a task", !tasks.some((t) => /Smith/.test(t.desc + t.customer)));
    check("3 lines saved to Monday's notes (skipped ones not saved)", day.length === 3, day.map((l) => l.text));
    const bl = day.find((l) => /Smith/.test(l.text));
    check("Appointment wording preserved and details saved", bl.text === "Smith called to schedule estimate Thursday at 9:30" && bl.kind === "appointment" && bl.appt.date === "2026-11-05" && !bl.appt.confirmed);
    const cl = day.find((l) => /10518/.test(l.text));
    const newTask = tasks.find((t) => t.folder === "10518");
    check("Note line and new task are linked both ways", cl.taskId === newTask.id && newTask.noteRef.lineId === cl.id);
    check("Import recorded in history (text only)", (await store(page, KEYS.imports)).length === 1);
    check("Appointment shows in Thursday's 'appointments' box", await (async () => { await page.fill("#dayPicker", "2026-11-05"); await page.dispatchEvent("#dayPicker", "change"); return /Smith called/.test(await page.textContent("#apptBox")); })());

    // Approve a completion this time.
    await pasteImport(page, "~~10452 Jones - check bumper bracket order~~", "2026-11-02");
    c = await cards(page);
    await decide(page, c[0].i, "approve");
    await apply(page);
    tasks = await store(page, KEYS.tasks);
    const br = findTaskIn(tasks, "t-bracket");
    check("Approved completion marks the task done", br.done && br.completedAt);
    check("Completion is logged on the task", /Completed from daily notes/.test(br.log[br.log.length - 1].text));
    check("Unrelated task in same folder untouched", !findTaskIn(tasks, "t-rental").done);
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Re-import and duplicate prevention");
  {
    const page = await open(browser, v13Seed());
    const first = "10452 Jones - check bumper bracket order\n10518 - follow up with parts on mirror ETA\nSmith called to schedule estimate Thursday at 9:30";
    await pasteImport(page, first, "2026-11-02");
    let c = await cards(page);
    const bracket = card(c, /bumper bracket/);
    check("First import: bracket line links to the existing task instead of a new one", bracket.action === "link" && bracket.chosen === "t-bracket", bracket);
    await apply(page);
    let tasks = await store(page, KEYS.tasks);
    check("First import: one new task (10518), none for the bracket", tasks.length === 5, tasks.map((t) => t.desc));
    const linkedLine = (await store(page, KEYS.notebook)).days["2026-11-02"].lines[0];
    check("Bracket note line linked to the existing task", linkedLine.taskId === "t-bracket");

    const firstAt = (await store(page, KEYS.notebook)).days["2026-11-02"].lines[1].at;
    await pasteImport(page, first, "2026-11-02");
    c = await cards(page);
    check("Same notes again: nothing new suggested", c.length === 0, c);
    check("Summary says lines are already in notes", /3 already in your notes/.test(await page.textContent("#reviewSummary")));
    check("Apply is disabled", await page.isDisabled("#applyNotesBtn"));
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");

    // Updated notes: old line now crossed out (OCR-ish slip), plus a new line.
    await pasteImport(page, "10452 Jones - check bumper bracket order\n~~10513 follow up with parts on mirror CTA~~\nSmith called to schedule estimate Thursday at 9:30\nCall Chen re rental extension", "2026-11-02");
    c = await cards(page);
    const mirror = card(c, /mirror/), chen = card(c, /Chen/);
    check("Updated screenshot: crossed-out old line suggests completing ITS task", mirror && mirror.action === "complete" && /Already linked/.test(mirror.matchText), mirror);
    check("...and is not pre-approved", mirror && !mirror.approved);
    check("New line offered as new", chen && chen.action === "task" && chen.approved, chen);
    check("Unchanged lines hidden as 'no change'", c.length === 2, c.map((x) => x.text));
    await decide(page, mirror.i, "approve");
    await apply(page);
    tasks = await store(page, KEYS.tasks);
    const nb = await store(page, KEYS.notebook);
    check("No duplicate tasks after repeated imports", tasks.filter((t) => /mirror/i.test(t.desc)).length === 1 && tasks.length === 6, tasks.map((t) => t.desc));
    check("Mirror task completed", tasks.find((t) => /mirror/i.test(t.desc)).done);
    const ml = nb.days["2026-11-02"].lines.find((l) => /mirror/.test(l.text));
    check("Existing note line updated, not duplicated", nb.days["2026-11-02"].lines.length === 4 && ml.done && ml.text === "10518 - follow up with parts on mirror ETA", nb.days["2026-11-02"].lines.map((l) => l.text));
    check("Visual mark kept separately on the line", ml.vis.some((v) => v.mark === "strike"));
    check("Original time and source date kept", ml.at === firstAt && Object.keys(nb.days).join() === "2026-11-02");

    // Same lines imported under the wrong date are flagged.
    await pasteImport(page, "Call Chen re rental extension", "2026-11-03");
    c = await cards(page);
    check("Line found on another day is flagged and needs a decision", c[0] && /also on Today/.test(c[0].notes) && !c[0].approved, c[0]);
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Screenshot import with real OCR and visual marks");
  {
    const page = await open(browser, v13Seed());
    const lines = [
      { text: "10452 Jones - check bumper bracket order", mark: "highlight" },
      { text: "10518 - follow up with parts on mirror ETA", mark: "strike" },
      { text: "Smith called to schedule estimate Thursday at 9:30" },
      { text: "Call Garcia about rental", box: "checked" },
      { text: "Lee rear ended at light, cust states no injuries", box: "empty" }
    ];
    const png = await notesScreenshot(browser, lines);
    fs.writeFileSync(path.join(OUT, "fixture-notes.png"), png);
    const t0 = Date.now();
    await imageImport(page, [png], "2026-11-02");
    console.log("  (OCR took " + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
    let c = await cards(page);
    const A = card(c, /bracket/), C = card(c, /mirror/), B = card(c, /Smith/), G = card(c, /Garcia/), L = card(c, /rear ended/);
    check("All 5 lines read", c.length === 5, c.map((x) => x.text));
    check("Highlighted line detected (likely)", A && /Highlighted \(likely\)/.test(A.head), A && A.head);
    check("Highlighted line read correctly", A && /10452 Jones - check bumper bracket order/.test(A.text), A && A.text);
    check("Highlight (meaning 'done') -> completion of bracket task suggested, needs approval", A && A.action === "complete" && A.chosen === "t-bracket" && !A.approved, A);
    check("Crossed-out line detected (likely)", C && /Crossed out \(likely\)/.test(C.head), C && C.head);
    check("Crossed-out line with no matching task -> save note as done", C && C.action === "done", C);
    check("Checked checkbox detected", G && /Checked/.test(G.head), G && G.head);
    check("Checkbox symbol not in the text", G && /^Call Garcia about rental$/.test(G.text), G && G.text);
    check("Empty checkbox is not a mark", L && !/Checked/.test(L.head) && /^Lee rear/.test(L.text), L);
    check("Unmarked appointment line has no marks", B && !/Highlighted|Crossed|Checked/.test(B.head) && B.action === "appt", B);
    check("Each line shows its picture from the screenshot", c.every((x) => x.hasCrop));
    check("Screenshot thumbnail available for review", (await page.$$("#reviewImages img")).length === 1);
    check("Extracted text available for review", /bumper bracket/.test(await page.textContent("#reviewText")));
    await page.screenshot({ path: path.join(OUT, "review-screenshot-import.png"), fullPage: true });
    await apply(page);
    let tasks = await store(page, KEYS.tasks);
    check("Screenshot alone completed nothing (completion not approved)", !findTaskIn(tasks, "t-bracket").done);
    const nb = await store(page, KEYS.notebook);
    const day = nb.days["2026-11-02"].lines;
    check("Approved lines saved; the undecided completion line was not", day.length === 4 && day.every((l) => l.src === "image") && !day.some((l) => /bracket/.test(l.text)), day.map((l) => l.text));
    const mline = day.find((l) => /mirror/.test(l.text));
    check("Crossed-out line saved as done, with the mark recorded", mline && mline.done && mline.vis.some((v) => v.mark === "strike"));
    check("Image itself not stored anywhere", !JSON.stringify(await page.evaluate(() => Object.assign({}, localStorage))).includes("data:image"));
    const imp = await store(page, KEYS.imports);
    check("Import history has the extracted text", imp.length === 1 && imp[0].src === "image" && /mirror/.test(imp[0].text));

    // Second screenshot later in the day: same lines + a new one
    const png2 = await notesScreenshot(browser, lines.concat([{ text: "10777 Lee - send supplement photos to adjuster" }]));
    await imageImport(page, [png2], "2026-11-02");
    c = await cards(page);
    const A2 = card(c, /bracket/);
    check("Re-imported screenshot: only the new line and the still-pending completion are offered", c.length <= 2 && c.some((x) => /10777/.test(x.text)), c.map((x) => x.text + " / " + x.action));
    check("Re-imported highlighted line still offers the completion, not a duplicate note", !A2 || A2.action === "complete");
    const lee = card(c, /10777/);
    check("New line matched to Lee's supplement task at most medium (different wording)", lee && (lee.action === "task" || lee.action === "link"), lee);
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");

    // Dark mode screenshot
    const dark = await notesScreenshot(browser, [{ text: "10600 Garcia - check parts ETA", mark: "strike" }, { text: "Rivera wants a call back about paint", mark: "highlight" }], { bg: "#1c1c1e", fg: "#eee" });
    await imageImport(page, [dark], "2026-11-02");
    c = await cards(page);
    check("Dark mode: strike detected", c.some((x) => /Crossed out/.test(x.head) && !/Rivera/.test(x.text)), c.map((x) => x.head + " " + x.text));
    check("Dark mode: highlight detected", c.some((x) => /Rivera/.test(x.text) && /Highlighted/.test(x.head)), c.map((x) => x.head + " " + x.text));
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");

    // Blank / unreadable image
    const blank = await notesScreenshot(browser, [{ text: " " }]);
    await page.setInputFiles("#imageFile", [{ name: "blank.png", mimeType: "image/png", buffer: blank }]);
    await page.waitForFunction(() => /No text found/.test(document.getElementById("ocrStatusText").textContent), null, { timeout: 60000 });
    check("Blank image: clear message, no review", await page.isHidden("#reviewPanel"));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Ambiguous and wrong OCR");
  {
    const page = await open(browser, v13Seed({ [KEYS.tasks]: BASE_TASKS.concat([task("t-bracket2", "10452", "Jones", "Check bumper bracket price", "Parts")]) }));
    await pasteImport(page, "~~10452 Jones - check bumper bracket~~\n~~10457 Jones verify bumper bracket ordered~~\n10452 done ✓\nTh3 c@r !s r3dy", "2026-11-02");
    const c = await cards(page);
    const amb = card(c, /check bumper bracket$/);
    check("Two similar tasks in one folder: no HIGH, user picks", amb && !/High confidence/.test(amb.matchText) && /just as close/.test(amb.matchText), amb && amb.matchText);
    const slip = card(c, /10457/);
    check("Folder misread by one digit: offered with an explanation", slip && /one digit off/.test(slip.matchText), slip);
    check("Misread folder isn't treated as HIGH", slip && !/High confidence/.test(slip.matchText.split("\n")[0]));
    const vague = card(c, /10452 done/);
    check("'10452 done' with several open tasks: no task picked for you", vague && vague.chosen === "", vague);
    const junk = card(c, /Th3/);
    check("Garbled line is uncertain, not a task", junk && junk.kind === "uncertain" && junk.action !== "task" && !junk.approved, junk);
    await page.click("#approveAllBtn");
    const after = await cards(page);
    check("'Approve all' never approves task completions", after.filter((x) => x.action === "complete").every((x) => !x.approved));
    await apply(page);
    check("Nothing completed without a chosen, approved task", (await store(page, KEYS.tasks)).every((t) => !t.done));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("'Suggest tasks' on an existing page, and 'Make it a task'");
  {
    const page = await open(browser, v13Seed({
      [KEYS.notebook]: { version: 1, days: { "2026-11-02": { lines: [
        { id: "n1", text: "10777 Lee - submit supplement hidden frame damage", at: "2026-11-02T13:00:00.000Z", block: "a", done: true },
        { id: "n2", text: "Order mirror glass for 10888 Patel", at: "2026-11-02T13:01:00.000Z", block: "a" },
        { id: "n3", text: "Patel says car pulls left", at: "2026-11-02T13:02:00.000Z", block: "a" }
      ] } } }
    }));
    await page.click("#reviewPageBtn");
    await page.waitForSelector("#reviewPanel:not([hidden])");
    const c = await cards(page);
    check("Checked-off line suggests completing Lee's open task", card(c, /Lee/) && card(c, /Lee/).action === "complete" && card(c, /Lee/).chosen === "t-lee");
    check("Unlinked follow-up suggests a task", card(c, /mirror glass/) && card(c, /mirror glass/).action === "task");
    check("Statement suggested as info", card(c, /pulls left/) && card(c, /pulls left/).action === "info");
    await apply(page);
    const nb = await store(page, KEYS.notebook);
    check("Existing lines updated in place (no new lines)", nb.days["2026-11-02"].lines.length === 3);
    check("Lee task not completed (wasn't approved)", !findTaskIn(await store(page, KEYS.tasks), "t-lee").done);
    await page.click('#pageLines .lbtn[data-act="more"][data-id="n3"]');
    await page.click('[data-sheet="maketask"]');
    await page.waitForSelector("#reviewPanel:not([hidden])");
    const one = await cards(page);
    check("'Make it a task' opens a one-line review set to Create task", one.length === 1 && one[0].action === "task");
    await decide(page, one[0].i, "approve");
    await apply(page);
    check("Task created from the line", (await store(page, KEYS.tasks)).some((t) => /pulls left/i.test(t.desc)));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Migration from v1.2 storage");
  {
    const v12Tasks = [
      { id: "a1", customer: "Rivera", folder: "90452", desc: "Call adjuster about supplement", category: "Supplements", estimator: "Dana", createdAt: "2026-10-20T14:00:00.000Z", done: false, completedAt: null, example: false },
      { id: "a2", customer: "Ann Lee", folder: "90470", desc: "Sublet alignment", category: "Sublet", estimator: "", createdAt: "2026-10-21T14:00:00.000Z", done: true, completedAt: "2026-10-22T14:00:00.000Z", example: false }
    ];
    const raw = JSON.stringify(v12Tasks);
    const page = await open(browser, { [KEYS.tasks]: raw, "repairAdvisorPlanner.lastEstimator": "Dana" });
    const tasks = await store(page, KEYS.tasks);
    check("v1.2 tasks kept", tasks.length === 2 && tasks[0].desc === "Call adjuster about supplement" && tasks[1].done);
    check("No example tasks added for an existing user", !tasks.some((t) => t.example));
    check("Copy of v1.2 tasks kept before migrating", await page.evaluate((k) => localStorage.getItem(k), KEYS.preV13) === raw);
    check("Storage version recorded", await page.evaluate((k) => localStorage.getItem(k), KEYS.schema) === "3");
    check("Empty notebook created", JSON.stringify(await store(page, KEYS.notebook)) === JSON.stringify({ version: 1, days: {} }));
    await page.click('.tab[data-tab="tasks"]');
    check("Board shows the old tasks", (await page.$$("#carriedList .task")).length === 1 && (await page.$$("#completedList .task")).length === 1);
    await page.fill("#search", "9045");
    check("Search still works", (await page.$$("#carriedList .task")).length === 1);
    await page.fill("#search", "");
    await page.click('#categoryChips [data-category="Sublet"]');
    check("Category filter still works", (await page.$$("#carriedList .task")).length === 0 && (await page.$$("#completedList .task")).length === 1);
    await page.click("#clearFiltersBtn");
    await page.fill("#fDesc", "call rivera 90452 re supp");
    await page.dispatchEvent("#fDesc", "blur");
    check("Smart autofill still works", (await page.inputValue("#fFolder")) === "90452" && (await page.inputValue("#fCategory")) === "Supplements");
    await page.click("#submitBtn");
    check("Adding a task still works", (await store(page, KEYS.tasks)).length === 3);
    await page.click('#carriedList .check[data-id="a1"]');
    check("Completing a task still works", findTaskIn(await store(page, KEYS.tasks), "a1").done);
    await page.reload();
    check("Migration runs once (copy unchanged on reload)", await page.evaluate((k) => localStorage.getItem(k), KEYS.preV13) === raw);
    // Brand-new install still gets examples
    const fresh = await open(browser, {});
    check("Fresh install: example tasks", (await store(fresh, KEYS.tasks)).filter((t) => t.example).length === 3);
    check("No page errors", page.errors.length === 0 && fresh.errors.length === 0, page.errors.concat(fresh.errors));
    await fresh.context().close();
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Backup export, restore, old formats, undo");
  {
    const page = await open(browser, v13Seed());
    await page.fill("#noteEntry", "10518 - follow up with parts on mirror ETA\nCall Chen re rental");
    await page.click("#addNoteBtn");
    await page.click('.tab[data-tab="tasks"]');
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#exportBtn")]);
    const file = path.join(OUT, "backup-v3.json");
    await dl.saveAs(file);
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    check("Backup has version 3, tasks, notebook and settings", backup.version === 3 && backup.tasks.length === 4 && backup.notebook.days["2026-11-02"].lines.length === 2 && backup.settings);

    // Wipe, then restore
    await page.evaluate(() => { localStorage.setItem("repairAdvisorPlanner.tasks.v1", "[]"); localStorage.setItem("repairAdvisorPlanner.notebook.v1", JSON.stringify({ version: 1, days: {} })); });
    await page.reload();
    await page.click('.tab[data-tab="tasks"]');
    await page.setInputFiles("#importFile", file);
    await page.waitForSelector("#confirmBox:not([hidden])");
    check("Restore asks first and names what's replaced", /0 tasks and 0 note lines/.test(await page.textContent("#confirmText")));
    await page.click("#confirmOk");
    check("Restore brings back tasks and notes", (await store(page, KEYS.tasks)).length === 4 && (await store(page, KEYS.notebook)).days["2026-11-02"].lines.length === 2);
    check("Restored notes visible", (await page.click('.tab[data-tab="notes"]'), (await lineTexts(page)).length === 2));

    // v1.0 backup (due dates and priorities) restores tasks and keeps notes
    const v10 = { app: "repair-advisor-planner", version: 1, exportedAt: "2025-01-01T00:00:00Z", tasks: [
      { id: "old", customer: "Kim", folder: "77001", desc: "Return core to vendor", category: "Parts", due: "2025-01-05", priority: "High", createdAt: "2025-01-02T10:00:00Z", done: false, completedAt: null }
    ] };
    const v10file = path.join(OUT, "backup-v1.0.json");
    fs.writeFileSync(v10file, JSON.stringify(v10));
    await page.click('.tab[data-tab="tasks"]');
    await page.setInputFiles("#importFile", v10file);
    await page.waitForSelector("#confirmBox:not([hidden])");
    check("Old backup: message says notes are kept", /daily notes are kept/.test(await page.textContent("#confirmText")));
    await page.click("#confirmOk");
    let tasks = await store(page, KEYS.tasks);
    check("v1.0 backup tasks imported (old fields dropped)", tasks.length === 1 && tasks[0].desc === "Return core to vendor" && tasks[0].due === undefined);
    check("Notes untouched by an old backup", (await store(page, KEYS.notebook)).days["2026-11-02"].lines.length === 2);

    // Bare array (v1.2 also accepted that)
    const bare = path.join(OUT, "backup-bare.json");
    fs.writeFileSync(bare, JSON.stringify(BASE_TASKS.slice(0, 2)));
    await page.setInputFiles("#importFile", bare);
    await page.click("#confirmOk");
    check("Bare task list backup imports", (await store(page, KEYS.tasks)).length === 2);

    // Undo
    check("Undo link appears", await page.isVisible("#undoRestoreBtn"));
    await page.click("#undoRestoreBtn");
    await page.click("#confirmOk");
    tasks = await store(page, KEYS.tasks);
    check("Undo puts back what was there before the last import", tasks.length === 1 && tasks[0].desc === "Return core to vendor");

    // Bad files are refused without changes
    const bad = path.join(OUT, "backup-bad.json");
    fs.writeFileSync(bad, JSON.stringify({ app: "repair-advisor-planner", version: 3, tasks: [], notebook: { version: 1, days: { "not-a-date": { lines: [] } } } }));
    await page.setInputFiles("#importFile", bad);
    await page.waitForTimeout(300);
    check("Damaged notebook in backup is refused", await page.isHidden("#confirmBox") && /bad date/.test(await page.textContent("#toast")));
    const other = path.join(OUT, "backup-other.json");
    fs.writeFileSync(other, JSON.stringify({ app: "something-else", tasks: [] }));
    await page.setInputFiles("#importFile", other);
    await page.waitForTimeout(300);
    check("Backup from another app is refused", /different app/.test(await page.textContent("#toast")));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("iPad layout (touch, portrait and landscape)");
  {
    for (const vp of [{ name: "ipad-portrait", width: 820, height: 1180 }, { name: "ipad-landscape", width: 1180, height: 820 }, { name: "phone", width: 390, height: 844 }]) {
      const page = await open(browser, v13Seed({ [KEYS.notebook]: { version: 1, days: { "2026-11-02": { lines: [
        { id: "x1", text: "10452 Jones - check bumper bracket order", at: "2026-11-02T13:00:00.000Z", block: "a", hl: true },
        { id: "x2", text: "Smith called to schedule estimate Thursday at 9:30", at: "2026-11-02T13:01:00.000Z", block: "a", kind: "appointment", appt: { date: "2026-11-05", time: "09:30", confirmed: false } },
        { id: "x3", text: "10518 - follow up with parts on mirror ETA, customer wants an update before the end of the day because they need the car for a trip", at: "2026-11-02T13:02:00.000Z", block: "b", done: true }
      ] } } } }), { context: { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: vp.name === "phone", deviceScaleFactor: 2 } });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(vp.name + ": no sideways scrolling", overflow <= 0, overflow);
      const small = await page.$$eval("#pageLines button, .page-tools .btn, #addNoteBtn, .tab", (els) =>
        els.filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim() || e.getAttribute("aria-label"), Math.round(r.width), Math.round(r.height)]; })
          .filter((x) => x[1] < 44 || x[2] < 44));
      check(vp.name + ": buttons are at least 44px", small.length === 0, small);
      const fontOk = await page.$$eval("#noteEntry, #notesInput, #noteSearch", (els) => els.every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16));
      check(vp.name + ": text boxes 16px+ (no Safari zoom on focus)", fontOk);
      await page.tap('#pageLines .lchk[data-id="x1"]');
      check(vp.name + ": tapping the check box checks off a line", (await store(page, KEYS.notebook)).days["2026-11-02"].lines[0].done);
      await page.screenshot({ path: path.join(OUT, "notes-" + vp.name + ".png"), fullPage: true });
      await pasteImport(page, "~~10452 Jones - check bumper bracket order~~\n10777 call adjuster re supplement", "2026-11-02");
      const ov2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(vp.name + ": review screen has no sideways scrolling", ov2 <= 0, ov2);
      await page.screenshot({ path: path.join(OUT, "review-" + vp.name + ".png"), fullPage: false });
      check(vp.name + ": no page errors", page.errors.length === 0, page.errors);
      await page.context().close();
    }
  }

  await browser.close();
  console.log("\n" + passes + " passed, " + failures + " failed");
  console.log("Screenshots and backup files: " + OUT);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("Test run crashed in section '" + current + "':", e); process.exit(2); });
