/* v1.5 tests: the everyday task workflow on an iPhone-sized screen, follow-up
   dates, "waiting on", overdue, search by words, and smart-reader fixes.
   Fictional data only. */
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function workflowTests(h) {
  const { browser, open, check, section, store, cards, card, apply, KEYS, OUT } = h;
  const iphone = { context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } };
  const NOW = new Date("2026-11-16T10:00:00");   // a Monday
  const old = (id, folder, customer, desc, category, daysAgo, extra) => Object.assign({ id, folder, customer, desc, category, estimator: "",
    createdAt: new Date(NOW.getTime() - daysAgo * 864e5).toISOString(), done: false, completedAt: null, example: false }, extra || {});
  const ids = (page, list) => page.$$eval("#" + list + " .task .check", (els) => els.map((e) => e.getAttribute("data-id")));
  const tasksOf = (page) => store(page, KEYS.tasks);

  section("v1.5 everyday workflow on iPhone: add, edit, complete, refresh, overdue, search, filter");
  {
    const page = await open(browser, { [KEYS.schema]: "4", [KEYS.notebook]: { version: 1, days: {} }, [KEYS.tasks]: [
      old("o1", "10452", "Jones", "Verify bumper bracket was ordered", "Parts", 5),
      old("o2", "10600", "Garcia", "Call customer about rental", "Customer", 1),
      old("o3", "10777", "Lee", "Supplement sent to adjuster", "Supplements", 6, { waitingOn: "Adjuster" }),
      old("o4", "10888", "Patel", "Check ADAS calibration result", "Sublet", 2, { followUp: "2026-11-13" }),
      old("o5", "10999", "Kim", "Confirm paint match", "Other", 4, { followUp: "2026-11-20" })
    ] }, Object.assign({ now: NOW }, iphone));
    await page.tap('.tab[data-tab="tasks"]');
    // 1. Add (one box, one button)
    check("Phone: optional details are folded away", !(await page.$eval("#moreFields", (e) => e.open)));
    await page.fill("#fDesc", "call Rivera 10321 re supp waiting on adjuster tomorrow");
    await page.dispatchEvent("#fDesc", "blur");
    await page.tap("#submitBtn");
    let all = await tasksOf(page);
    const added = all.find((t) => t.folder === "10321");
    check("1. Task added from one line", !!added && added.customer === "Rivera" && added.category === "Supplements", added);
    check("   'waiting on adjuster' and 'tomorrow' were picked up", added && added.waitingOn === "Adjuster" && added.followUp === "2026-11-17", added);
    check("   New task shows under Today", (await ids(page, "todayList")).includes(added.id));
    // 2. Edit
    await page.tap('#todayList [data-action="edit"][data-id="' + added.id + '"]');
    check("   Editing opens the details", await page.$eval("#moreFields", (e) => e.open));
    await page.fill("#fDesc", "Call Rivera about supplement approval");
    await page.fill("#fWaitingOn", "");
    await page.fill("#fFollowUp", "");
    await page.tap("#submitBtn");
    all = await tasksOf(page);
    check("2. Edit saved", all.find((t) => t.id === added.id).desc === "Call Rivera about supplement approval" && all.find((t) => t.id === added.id).waitingOn === "");
    // 3. Complete
    await page.tap('#todayList .check[data-id="' + added.id + '"]');
    check("3. Completed task moves to Completed", (await ids(page, "completedList")).includes(added.id) && (await tasksOf(page)).find((t) => t.id === added.id).done);
    // 4. Refresh
    await page.reload();
    await page.tap('.tab[data-tab="tasks"]');
    check("4. Everything persists after refresh", (await tasksOf(page)).length === 6 && (await ids(page, "completedList")).includes(added.id));
    check("   The board tab is remembered", await page.getAttribute("body", "data-view") === "tasks");
    // 5. Overdue / carried over / waiting
    const today = await ids(page, "todayList"), carried = await ids(page, "carriedList");
    check("5. A follow-up date that has passed shows under Today, marked overdue", today[0] === "o4" && /Overdue/.test(await page.textContent('#todayList .task')), today);
    check("   Carried over lists overdue first, waiting and later last", carried.join() === "o1,o2,o3,o5", carried);
    check("   Open 3+ days with no date is overdue", /Overdue/.test(await page.$eval('.check[data-id="o1"]', (e) => e.closest(".task").textContent)));
    check("   'Waiting on' is not counted as overdue", !/Overdue/.test(await page.$eval('.check[data-id="o3"]', (e) => e.closest(".task").textContent)) && /Waiting on Adjuster/.test(await page.$eval('.check[data-id="o3"]', (e) => e.closest(".task").textContent)));
    check("   A future follow-up date is not overdue", /Follow up/.test(await page.$eval('.check[data-id="o5"]', (e) => e.closest(".task").textContent)) && !/Overdue/.test(await page.$eval('.check[data-id="o5"]', (e) => e.closest(".task").textContent)));
    const stat = (id) => page.$eval("#" + id + " .num", (e) => e.textContent);
    check("   Summary: 3 need you, 2 overdue, 2 waiting", (await stat("statAttention")) === "3" && (await stat("statStale")) === "2" && (await stat("statWaiting")) === "2", [await stat("statAttention"), await stat("statStale"), await stat("statWaiting")]);
    await page.tap('[data-action="tomorrow"][data-id="o1"]');
    check("   'Tomorrow' sets the follow-up to the next workday", (await tasksOf(page)).find((t) => t.id === "o1").followUp === "2026-11-17");
    // 6. Search and filter
    await page.fill("#search", "calibration");
    check("6. Search finds words in the task, not just folder/customer", (await ids(page, "todayList")).join() === "o4" && (await ids(page, "carriedList")).length === 0);
    await page.fill("#search", "10600");
    check("   Search by folder #", (await ids(page, "carriedList")).join() === "o2");
    await page.fill("#search", "");
    await page.tap('#statusChips [data-status="waiting"]');
    check("   'Waiting on others' filter", (await ids(page, "carriedList")).sort().join() === "o1,o3,o5" || (await ids(page, "carriedList")).sort().join() === "o3,o5", await ids(page, "carriedList"));
    await page.tap('#statusChips [data-status="overdue"]');
    check("   'Overdue' filter", (await ids(page, "todayList")).join() === "o4");
    await page.tap("#clearFiltersBtn");
    await page.tap('#categoryChips [data-category="Customer"]');
    check("   Category filter", (await ids(page, "carriedList")).join() === "o2");
    await page.tap("#clearFiltersBtn");
    // delete asks first
    await page.tap('[data-action="delete"][data-id="o2"]');
    check("   Delete asks first", await page.isVisible("#confirmBox"));
    await page.tap("#confirmOk");
    check("   Deleted after confirming", !(await tasksOf(page)).some((t) => t.id === "o2"));

    // 7-8. Import sample text and review
    await page.fill("#notesInput", "10452 Jones lvm x2\nGeico adj needs photos of 10777 frame\nState Farm claim # 55-1234-A9\n10518 mirror b/o eta 11/20\nPatel p/u Fri 4pm\nsupp sent 11/12 waiting on approval 10600");
    await page.tap("#readNotesBtn");
    await page.waitForSelector("#reviewPanel:not([hidden])");
    const c = await cards(page);
    check("7. Imported text opens a review; nothing saved yet", c.length === 6 && (await tasksOf(page)).length === 5);
    const f = (re, field) => page.inputValue('.rv[data-i="' + card(c, re).i + '"] [data-f="' + field + '"]');
    check("8. 'lvm x2' is a contact note (info or a status link), not a new task", ["info", "link"].includes(card(c, /lvm/).action) && card(c, /lvm/).action !== "task", card(c, /lvm/));
    check("   'needs photos' is a follow-up with folder 10777", card(c, /photos/).action !== "info" && (await f(/photos/, "folder")) === "10777", card(c, /photos/));
    check("   A claim # is NOT taken as a folder #", card(c, /claim/).action === "info" && !/55-1234/.test(await page.$eval('.rv[data-i="' + card(c, /claim/).i + '"]', (e) => (e.querySelector('[data-f="folder"]') || { value: "" }).value)));
    check("   'b/o eta 11/20' is parts status info, not an appointment", card(c, /mirror/).action === "info", card(c, /mirror/));
    check("   'p/u Fri 4pm' is an appointment (Fri Nov 20, 4 PM)", card(c, /Patel/).action === "appt" && (await f(/Patel/, "apptDate")) === "2026-11-20" && (await f(/Patel/, "apptTime")) === "16:00");
    await page.tap("#approveAllBtn");
    await apply(page);
    const after = await tasksOf(page);
    const supp = after.find((t) => t.folder === "10600" && /supplement sent/i.test(t.desc));
    check("   Applying creates only the follow-ups as tasks", after.length === 7, after.map((t) => t.desc));
    check("   'waiting on approval' carried onto the new task", supp && supp.waitingOn === "Approval", supp);

    // 9. Export and re-import
    const [dl] = await Promise.all([page.waitForEvent("download"), page.tap("#exportBtn")]);
    const file = path.join(OUT, "backup-v1.5.json");
    await dl.saveAs(file);
    const b = JSON.parse(fs.readFileSync(file, "utf8"));
    check("9. Backup keeps follow-up dates and waiting-on", b.tasks.find((t) => t.id === "o5").followUp === "2026-11-20" && b.tasks.find((t) => t.id === "o3").waitingOn === "Adjuster");
    await page.evaluate((k) => localStorage.setItem(k, "[]"), KEYS.tasks);
    await page.reload();
    await page.setInputFiles("#importFile", file);
    await page.tap("#confirmOk");
    check("   Restore brings every task back", (await tasksOf(page)).length === 7 && (await tasksOf(page)).find((t) => t.id === "o3").waitingOn === "Adjuster");

    // 10. iPhone layout
    await page.tap('.tab[data-tab="tasks"]');
    const m = await page.evaluate(() => ({ ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      listTop: Math.round(document.getElementById("todayList").getBoundingClientRect().top + scrollY),
      tabRows: new Set([...document.querySelectorAll(".tab")].map((e) => Math.round(e.getBoundingClientRect().top))).size }));
    check("10. iPhone: no sideways scrolling", m.ov <= 0, m);
    check("    iPhone: tasks start within about one screen (was ~2,600px down)", m.listTop < 900, m);
    check("    iPhone: the four tabs fit on one row", m.tabRows === 1, m);
    const small = await page.$$eval(".task button, #submitBtn, .tab, #statusChips .chip, button.stat", (els) => els.filter((e) => e.offsetParent)
      .map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)]; }).filter((x) => x[1] < 40 || x[2] < 40));
    check("    iPhone: buttons are at least 40px", small.length === 0, small);
    await page.screenshot({ path: path.join(OUT, "iphone-tasks.png"), fullPage: true });
    await page.tap('.tab[data-tab="notes"]');
    const notesTop = await page.evaluate(() => Math.round(document.getElementById("notesPage").getBoundingClientRect().top + scrollY));
    check("    iPhone: the notes page is first on the Notes tab", notesTop < 200, notesTop);
    await page.screenshot({ path: path.join(OUT, "iphone-notes.png"), fullPage: false });
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  section("v1.5: older data without the new fields");
  {
    const page = await open(browser, { [KEYS.schema]: "4", [KEYS.notebook]: { version: 1, days: {} }, [KEYS.tasks]: [old("x1", "10452", "Jones", "Verify bracket", "Parts", 1)] }, { now: NOW });
    const t = (await tasksOf(page))[0];
    await page.click('.tab[data-tab="tasks"]');
    check("v1.4 task loads unchanged and shows as open", t.desc === "Verify bracket" && (await ids(page, "carriedList")).join() === "x1");
    check("Desktop: details are open by default", await page.$eval("#moreFields", (e) => e.open));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }
};
