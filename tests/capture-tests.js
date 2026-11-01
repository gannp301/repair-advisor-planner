/* v1.4 tests: Capture Inbox, source recognition, scrapbook, theme, stickers,
   motivation, storage safety. Called from run-tests.js with its helpers.
   All people, folders and messages are fictional. */
"use strict";
const fs = require("fs");
const path = require("path");

// Fictional pictures, drawn by the browser. "Photos" get a table edge,
// uneven light, film grain and a slight tilt so they don't look like
// clean screenshots; screenshots stay flat. These are stand-ins: real
// handwriting and real phone photos are harder (see README).
const GRAIN = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.5 0"/></filter></svg>';
function photoHtml(paperCss, inner, opts) {
  opts = opts || {};
  return '<html><body style="margin:0;background:' + (opts.table || "#9C8A78") + ';width:760px;height:' + (opts.h || 760) + 'px;overflow:hidden;position:relative">' + GRAIN +
    '<div style="position:absolute;left:' + (opts.left || 40) + 'px;top:40px;width:' + (opts.w || 680) + 'px;height:' + ((opts.h || 760) - 80) + 'px;transform:rotate(' + (opts.rot || -1.2) + 'deg);box-shadow:0 8px 18px rgba(0,0,0,.35);' + paperCss + '">' + inner + "</div>" +
    '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 40% 35%,rgba(255,255,240,.18),rgba(0,0,0,.22) 85%)"></div>' +
    '<div style="position:absolute;inset:0;filter:url(#grain);opacity:.35;background:#fff;mix-blend-mode:multiply"></div>' +
    "</body></html>";
}
const FIXTURES = {
  sticky: () => photoHtml("background:#FFE873;padding:70px 46px;font:italic 600 40px/1.5 'DejaVu Serif',serif;color:#1C2240",
    "10452 Jones -<br>check bumper<br>bracket ETA", { w: 640, h: 720, left: 60 }),
  notebook: () => photoHtml("background-color:#FFFDF4;background-image:linear-gradient(to right,transparent 70px,#E89AA8 70px,#E89AA8 72px,transparent 72px),repeating-linear-gradient(to bottom,transparent 0 39px,#9FC0E8 39px 41px);padding:42px 30px 0 90px;font:italic 30px/40px 'DejaVu Serif',serif;color:#1D2A6B",
    "Corolla rear-ended at stoplight,<br>trunk won't close<br>Lee asked about rental car", { table: "#7E8C96" }),
  email: () => '<html><body style="margin:0;background:#fff;font:15px/1.5 Inter,Arial,sans-serif;color:#222;width:820px;padding:0">' +
    '<div style="background:#f3f2f1;padding:10px 20px;border-bottom:1px solid #ddd;font-weight:600">Inbox</div><div style="padding:20px 28px">' +
    '<div style="font-size:22px;font-weight:600;margin-bottom:12px">Estimate appointment</div>' +
    "<div>From: Ann Smith &lt;ann.smith@example.com&gt;</div><div>To: Repair Advisor</div><div>Sent: Monday, November 2, 2026 8:12 AM</div>" +
    '<div>Subject: Estimate appointment</div><div style="height:18px"></div>' +
    "<div>Hi,</div><div>Smith confirmed estimate Thursday at 9:30 AM</div><div style=\"height:12px\"></div><div>Thanks,</div><div>Ann</div></div></body></html>",
  chat: () => '<html><body style="margin:0;background:#f5f5f5;font:15px/1.45 Inter,Arial,sans-serif;color:#242424;width:760px;padding:18px 24px">' +
    '<div style="font-size:13px;color:#616161;margin:10px 0 2px"><b style="color:#242424">Derek Miller</b>  10:42 AM</div>' +
    '<div style="background:#fff;border-radius:6px;padding:8px 12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,.1)">Derek confirmed bracket was ordered yesterday</div>' +
    '<div style="font-size:13px;color:#616161;margin:14px 0 2px"><b style="color:#242424">Priya Shah</b>  10:47 AM</div>' +
    '<div style="background:#fff;border-radius:6px;padding:8px 12px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,.1)">10777 adjuster approved the supplement</div>' +
    '<div style="text-align:right;font-size:13px;color:#616161;margin:14px 0 2px">10:49 AM</div>' +
    '<div style="text-align:right"><div style="background:#E8EBFA;border-radius:6px;padding:8px 12px;display:inline-block">thanks!</div></div></body></html>'
};

module.exports = async function captureTests(h) {
  const { browser, open, check, section, store, cards, card, decide, apply, imageImport, KEYS, BASE_TASKS, task, OUT } = h;
  const shot = async (name) => {
    const photo = name === "sticky" || name === "notebook";
    const p = await browser.newPage(photo ? { viewport: { width: 760, height: 760 }, deviceScaleFactor: 1.5 } : { deviceScaleFactor: 2 });
    await p.setContent(FIXTURES[name]());
    const buf = await p.screenshot({ fullPage: !photo });
    await p.close();
    fs.writeFileSync(path.join(OUT, "fixture-" + name + ".png"), buf);
    return buf;
  };
  const capItems = async (page) => ((await store(page, KEYS.captures)) || { items: [] }).items;
  const capPanels = (page) => page.$$eval("#reviewCaps .rv-cap", (els) => els.map((e) => ({
    label: e.querySelector(".src-chip").textContent.trim(), conf: e.querySelector(".conf").textContent.trim(),
    why: e.querySelector("p").textContent, id: e.getAttribute("data-cap")
  })));
  const captureText = async (page, text, date) => {
    if (date) await page.fill("#importDate", date);
    await page.fill("#notesInput", text);
    await page.click("#readNotesBtn");
    await page.waitForSelector("#reviewPanel:not([hidden])");
  };
  const v14Seed = (extra) => Object.assign({ [KEYS.schema]: "4", [KEYS.tasks]: BASE_TASKS, [KEYS.notebook]: { version: 1, days: {} } }, extra || {});
  const R = (page, fn, arg) => page.evaluate(fn, arg);

  /* ------------------------------------------------------------------ */
  section("v1.4 units: source clues, topics, the four examples");
  {
    const page = await open(browser, v14Seed());
    const ds = (text, origin, feat) => R(page, (a) => window.RepairPlannerTest.detectSource(a[2] || null, a[0], null, a[1]), [text, origin, feat]);
    check("Email header lines -> Email (likely)", (await ds("From: Ann Smith <ann@example.com>\nTo: Advisor\nSubject: Estimate\nSee you Thursday", "text")).source === "email");
    check("Chat name/time lines -> Teams / chat (likely)", (await ds("Derek Miller 10:42 AM\nbracket ordered\nPriya Shah 10:47 AM\nok", "text")).conf === "likely");
    check("Appointment words + time -> Appointment", (await ds("Appointment confirmed\nDrop-off Tuesday 8:00 AM\nEstimate with Dana", "text")).source === "appointment");
    check("Typed note with no clues -> Typed note", (await ds("call Lee about rental", "typed")).source === "typed");
    check("Pasted text with no clues -> Digital notes, only 'maybe'", (await ds("call Lee about rental", "text")).conf === "possible");
    check("Photo of pastel paper -> Sticky note", (await ds("10452 Jones", "image", { photo: true, sticky: true, stickySure: true, colorName: "yellow" })).source === "sticky");
    check("Photo of ruled paper -> Handwritten notebook", (await ds("Lee rental", "image", { photo: true, lined: true })).source === "notebook");
    check("Photo of brown paper -> Loose paper / envelope", (await ds("Lee rental", "image", { photo: true, kraft: true })).source === "scrap");
    check("Unclear photo -> Other, 'not sure'", (await ds("Lee rental", "image", { photo: true })).conf === "unsure");
    const tp = (t) => R(page, (x) => window.RepairPlannerTest.topicOf(x, window.RepairPlannerTest.analyzeLine(x, { knownCustomers: [], knownEstimators: [] }), window.RepairPlannerTest.classifyText(x).kind), t);
    const k = (t) => R(page, (x) => window.RepairPlannerTest.classifyText(x).kind, t);
    check("Sticky example is a follow-up", await k("10452 Jones - check bumper bracket ETA") === "followup");
    check("Teams example is info / status, not a to-do", await k("Derek confirmed bracket was ordered yesterday") === "reference" && await tp("Derek confirmed bracket was ordered yesterday") === "status");
    check("Email example is an appointment", await k("Smith confirmed estimate Thursday at 9:30 AM") === "appointment");
    check("Handwritten example is accident info", await k("Corolla rear-ended at stoplight, trunk won't close") === "reference" && await tp("Corolla rear-ended at stoplight, trunk won't close") === "accident");
    check("Customer concern recognised", await tp("Cust says door rattles over bumps") === "concern");
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Capture: typed / pasted text, keep without a task, link to a task, reject completion");
  {
    const page = await open(browser, v14Seed());
    // Teams text pasted as text: chat detected, sender lines kept out of notes, status update linked (not completed).
    await captureText(page, "Derek Miller 10:42 AM\nDerek confirmed bracket was ordered yesterday\nPriya Shah 10:47 AM\nBracket for 10452 Jones is done", "2026-11-02");
    let panels = await capPanels(page);
    check("Chat text recognised as Teams / chat", panels[0] && /Teams \/ chat/.test(panels[0].label) && /Likely/.test(panels[0].conf), panels);
    let c = await cards(page);
    const derek = card(c, /Derek confirmed/), done = card(c, /is done/);
    check("Sender name/time lines are not offered as notes", !c.some((x) => /10:4\d AM/.test(x.text)), c.map((x) => x.text));
    check("Status update suggests linking to the bracket task", derek && derek.action === "link" && derek.chosen === "t-bracket", derek);
    check("Status update is not pre-approved and never 'complete'", derek && !derek.approved && derek.action !== "complete");
    check("Co-worker name shown, not used as customer", derek && /Derek/.test(derek.head) && (await page.inputValue('.rv[data-i="' + derek.i + '"] [data-f="text"]')) === "Derek confirmed bracket was ordered yesterday");
    check("'is done' in a chat suggests a status update, not completion", done && done.action === "link" && !done.approved, done);
    await decide(page, derek.i, "approve");
    await decide(page, done.i, "skip");   // reject the completion idea
    await apply(page);
    let tasks = await store(page, KEYS.tasks);
    const br = tasks.find((t) => t.id === "t-bracket");
    check("Linked task stays OPEN", !br.done);
    check("Task history shows the update from the chat", /Update from teams \/ chat/i.test(br.log[br.log.length - 1].text), br.log);
    let caps = await capItems(page);
    check("One capture record", caps.length === 1);
    check("Capture remembers the link to the task", caps[0].links.tasks.indexOf("t-bracket") !== -1);
    check("Capture is Linked (all lines decided)", caps[0].status === "saved" && caps[0].links.tasks.length === 1);

    // Keep in inbox only
    await captureText(page, "Ins: Progressive claim 55-1234, adjuster Dana", "2026-11-02");
    c = await cards(page);
    await page.selectOption('.rv[data-i="' + c[0].i + '"] [data-f="action"]', "keep");
    await decide(page, c[0].i, "approve");
    const linesBefore = ((await store(page, KEYS.notebook)).days["2026-11-02"] || { lines: [] }).lines.length;
    await apply(page);
    tasks = await store(page, KEYS.tasks);
    caps = await capItems(page);
    const ins = caps.find((x) => /Progressive/.test(x.text));
    check("'Keep in inbox only' creates no task", tasks.length === 4);
    check("'Keep in inbox only' adds no note line", ((await store(page, KEYS.notebook)).days["2026-11-02"] || { lines: [] }).lines.length === linesBefore);
    check("...and the capture is Saved (not linked)", ins && ins.status === "saved" && !ins.links.lines.length && !ins.links.tasks.length, ins);

    // Correct a wrongly classified source
    await captureText(page, "Kim Lopez 2:15 PM\nneeds rental extended", "2026-11-02");
    panels = await capPanels(page);
    await page.selectOption('#reviewCaps select[data-cap-source]', "email");
    panels = await capPanels(page);
    check("Changing the source type updates the review", /Email/.test(panels[0].label) && /Set by you/.test(panels[0].conf), panels);
    caps = await capItems(page);
    check("Corrected source saved on the capture", caps.find((x) => /Kim Lopez/.test(x.text)).source === "email" && caps.find((x) => /Kim Lopez/.test(x.text)).sourceSet);
    c = await cards(page);
    check("With 'email', the chat-style name line is treated as text again", c.some((x) => /Kim Lopez/.test(x.text)));
    // Cancel keeps it in Needs review
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");
    caps = await capItems(page);
    check("Cancelled review: capture stays in Needs review", caps.find((x) => /Kim Lopez/.test(x.text)).status === "review");
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Capture from images: sticky note, email, Teams, handwritten notebook (real OCR)");
  {
    const page = await open(browser, v14Seed());
    const results = {};
    for (const name of ["sticky", "email", "chat", "notebook"]) {
      const buf = await shot(name);
      await imageImport(page, [buf], "2026-11-02");
      results[name] = { panels: await capPanels(page), cards: await cards(page) };
      if (name === "sticky") {
        const s = card(results.sticky.cards, /bracket/i);
        check("Sticky photo: text read", !!s, results.sticky.cards.map((x) => x.text));
        check("Sticky photo: follow-up -> add open task", s && s.action === "task", s);
        // save it (approve all except completions)
        await page.click("#approveAllBtn");
        await apply(page);
      } else {
        await page.click("#cancelReviewBtn"); await page.click("#confirmOk");
      }
    }
    const lbl = (n) => results[n].panels[0] ? results[n].panels[0].label + " (" + results[n].panels[0].conf + ": " + results[n].panels[0].why + ")" : "none";
    console.log("  (sources: sticky=" + lbl("sticky") + " | email=" + lbl("email") + " | chat=" + lbl("chat") + " | notebook=" + lbl("notebook") + ")");
    check("Sticky note photo recognised as Sticky note", /Sticky note/.test(lbl("sticky")), lbl("sticky"));
    check("Email screenshot recognised as Email", /Email/.test(lbl("email")), lbl("email"));
    check("Teams screenshot recognised as Teams / chat", /Teams/.test(lbl("chat")), lbl("chat"));
    check("Lined-paper photo recognised as Handwritten notebook", /notebook/i.test(lbl("notebook")), lbl("notebook"));
    const em = card(results.email.cards, /Thursday/);
    check("Email: appointment suggested, no task", em && em.action === "appt", results.email.cards.map((x) => x.text + "/" + x.action));
    check("Email: From/To/Sent lines kept out of notes", !results.email.cards.some((x) => /^(From|To|Sent):/.test(x.text)));
    const ch = card(results.chat.cards, /ordered/);
    check("Teams: status update links to the bracket task (pending)", ch && ch.action === "link" && ch.chosen === "t-bracket" && !ch.approved, ch);
    check("Teams: sender lines kept out of notes", !results.chat.cards.some((x) => /Derek Miller|Priya Shah/.test(x.text)));
    const nb = card(results.notebook.cards, /rear|stoplight|trunk/i);
    check("Handwritten-style: accident line read and saved as info (if readable)", !nb || nb.action === "info", nb);
    console.log("  (handwritten-style text read as: " + JSON.stringify(results.notebook.cards.map((x) => x.text)) + ")");

    // Re-import the sticky photo: same capture updated, nothing new
    const again = await shot("sticky");
    await imageImport(page, [again], "2026-11-02");
    const c2 = await cards(page);
    const caps = await capItems(page);
    check("Re-importing a processed screenshot adds no new capture", caps.filter((x) => /bracket/i.test(x.text) && x.source === "sticky").length === 1, caps.map((x) => x.source));
    check("...the existing capture is marked as updated", caps.some((x) => x.versions === 2));
    check("...and nothing new is suggested", c2.length === 0, c2.map((x) => x.text));
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");
    check("No duplicate task from the re-import", (await store(page, KEYS.tasks)).filter((t) => /bracket eta/i.test(t.desc)).length <= 1);
    check("No images stored", !JSON.stringify(await page.evaluate(() => Object.assign({}, localStorage))).includes("data:image"));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Capture Inbox: views, search, archive/restore, delete, refresh, thumbnails opt-in");
  {
    const caps = [
      { id: "c1", at: "2026-11-02T14:00:00.000Z", date: "2026-11-02", src: "image", source: "sticky", sourceAuto: "sticky", sourceConf: "likely", text: "10452 Jones - check bumper bracket ETA", lines: [{ t: "10452 Jones - check bumper bracket ETA" }], status: "review" },
      { id: "c2", at: "2026-11-02T14:05:00.000Z", date: "2026-11-02", src: "text", source: "email", sourceAuto: "email", sourceConf: "likely", text: "Smith confirmed estimate Thursday at 9:30 AM", lines: [{ t: "Smith confirmed estimate Thursday at 9:30 AM", res: { a: "keep" } }], status: "saved" },
      { id: "c3", at: "2026-11-02T14:10:00.000Z", date: "2026-11-02", src: "image", source: "chat", sourceAuto: "chat", sourceConf: "possible", text: "Derek confirmed bracket was ordered yesterday", lines: [{ t: "Derek confirmed bracket was ordered yesterday", res: { a: "link", taskId: "t-bracket" } }], status: "saved", links: { lines: [], tasks: ["t-bracket"] } },
      { id: "c4", at: "2026-11-01T14:10:00.000Z", date: "2026-11-01", src: "image", source: "notebook", sourceAuto: "notebook", sourceConf: "likely", text: "Corolla rear-ended at stoplight, trunk won't close", lines: [{ t: "Corolla rear-ended at stoplight, trunk won't close", res: { a: "info" } }], status: "archived" }
    ];
    const page = await open(browser, v14Seed({ [KEYS.captures]: { version: 1, items: caps } }));
    await page.click('.tab[data-tab="inbox"]');
    const listed = () => page.$$eval("#inboxList [data-cap]", (els) => els.map((e) => e.getAttribute("data-cap")));
    check("Needs review shows the unreviewed capture", JSON.stringify(await listed()) === '["c1"]');
    check("Tab shows how many need review", /\(1\)/.test(await page.textContent("#inboxTabCount")));
    await page.click('#inboxFilter [data-v="saved"]'); check("Saved view", JSON.stringify(await listed()) === '["c2"]');
    await page.click('#inboxFilter [data-v="linked"]'); check("Linked view", JSON.stringify(await listed()) === '["c3"]');
    await page.click('#inboxFilter [data-v="archived"]'); check("Archived view", JSON.stringify(await listed()) === '["c4"]');
    await page.fill("#inboxSearch", "10452"); check("Search by folder # (all views, linked task's folder counts)", (await listed()).sort().join() === "c1,c3");
    await page.fill("#inboxSearch", "jones"); check("Search by customer (linked task counts too)", (await listed()).sort().join() === "c1,c3");
    await page.fill("#inboxSearch", "trunk"); check("Search by extracted text, including archived", (await listed()).join() === "c4");
    await page.fill("#inboxSearch", "");
    await page.click('#inboxFilter [data-v="saved"]');
    await page.click('[data-cap="c2"] [data-cap-act="archive"]');
    check("Archive moves it out of Saved", (await listed()).length === 0);
    await page.click('#inboxFilter [data-v="archived"]');
    check("...into Archived", (await listed()).sort().join() === "c2,c4");
    await page.click('[data-cap="c2"] [data-cap-act="restore"]');
    await page.click('#inboxFilter [data-v="saved"]');
    check("Restore puts it back in Saved", (await listed()).join() === "c2");
    await page.click('[data-cap="c2"] [data-cap-act="details"]');
    check("Details show the text and source type picker", /Smith confirmed/.test(await page.textContent('[data-cap="c2"] .cap-details')) && await page.$('[data-cap="c2"] select[data-cap-act="source"]'));
    await page.selectOption('[data-cap="c2"] select[data-cap-act="source"]', "appointment");
    check("Source can be corrected from the inbox", (await capItems(page)).find((x) => x.id === "c2").source === "appointment");
    await page.click('#inboxFilter [data-v="archived"]');
    await page.click('[data-cap="c4"] [data-cap-act="delete"]');
    check("Delete asks first", await page.isVisible("#confirmBox"));
    await page.click("#confirmOk");
    check("Deleted after confirming", !(await capItems(page)).some((x) => x.id === "c4"));
    await page.reload();
    await page.click('.tab[data-tab="inbox"]');
    check("Inbox survives refresh", (await capItems(page)).length === 3);
    check("Inbox opens on the last view used", await page.getAttribute('#inboxFilter [data-v="archived"]', "aria-pressed") === "true");
    // Thumbnails are opt-in
    check("Saving pictures is off by default", !(await page.isChecked("#thumbToggle")));
    await page.check("#thumbToggle");
    const png = await (async () => { const p = await browser.newPage(); await p.setContent('<div style="font:28px Arial;padding:30px">Call Lee about rental car</div>'); const b = await p.screenshot(); await p.close(); return b; })();
    await imageImport(page, [png], "2026-11-02");
    await page.click("#cancelReviewBtn"); await page.click("#confirmOk");
    let withThumb = (await capItems(page)).filter((x) => x.thumb);
    check("With the option on, a small picture is kept", withThumb.length === 1 && withThumb[0].thumb.length < 300000);
    await page.click("#dropThumbsBtn"); await page.click("#confirmOk");
    check("'Delete all saved pictures' removes them", (await capItems(page)).every((x) => !x.thumb));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("Appearance: themes, scrapbook, stickers, decorations, motivation");
  {
    const caps = ["sticky", "email", "chat", "notebook", "scrap", "appointment", "digital"].map((src, i) => ({
      id: "s" + i, at: "2026-11-02T1" + i + ":00:00.000Z", date: "2026-11-02", src: "image", source: src, sourceAuto: src, sourceConf: "likely",
      text: ["10452 Jones - check bumper bracket ETA", "Smith confirmed estimate Thursday at 9:30 AM", "Derek confirmed bracket was ordered yesterday", "Corolla rear-ended at stoplight, trunk won't close", "Lee - rental through Friday", "Chen drop-off Tuesday 8:00 AM", "10600 Garcia paint match question"][i],
      lines: [{ t: ["10452 Jones - check bumper bracket ETA", "Smith confirmed estimate Thursday at 9:30 AM", "Derek confirmed bracket was ordered yesterday", "Corolla rear-ended at stoplight, trunk won't close", "Lee - rental through Friday", "Chen drop-off Tuesday 8:00 AM", "10600 Garcia paint match question"][i], res: { a: "keep" } }], status: "saved"
    }));
    const page = await open(browser, v14Seed({ [KEYS.captures]: { version: 1, items: caps } }));
    check("Classic Work is the default theme", await page.getAttribute("body", "data-theme") === "classic");
    const headerBg = () => page.$eval(".app-header", (e) => getComputedStyle(e).backgroundColor);
    const classicBg = await headerBg();
    await page.click('#themeSeg [data-v="strawberry"]');
    check("Strawberry Cottage switches colors", await page.getAttribute("body", "data-theme") === "strawberry" && (await headerBg()) !== classicBg);
    await page.reload();
    check("Theme remembered after refresh", await page.getAttribute("body", "data-theme") === "strawberry");
    await page.click('.tab[data-tab="inbox"]');
    await page.click('#inboxFilter [data-v="saved"]');
    await page.click('#inboxViewSeg [data-v="scrapbook"]');
    const classes = await page.$$eval("#inboxList .scrap", (els) => els.map((e) => e.className));
    check("Scrapbook draws each source its own way", ["sticky", "email", "chat", "notebook", "scrap", "appointment"].every((s) => classes.some((c) => c.includes("scrap-" + s))), classes);
    check("Scrapbook text is real, searchable text", /bumper bracket ETA/.test(await page.textContent("#inboxList")));
    await page.screenshot({ path: path.join(OUT, "scrapbook-strawberry.png"), fullPage: true });
    // Stickers
    await page.click('[data-slot="card:s0"]');
    check("Sticker picker offers 8-12 stickers", (await page.$$("#stickerGrid [data-sticker]")).length >= 8 && (await page.$$("#stickerGrid [data-sticker]")).length <= 12);
    await page.click('#stickerGrid [data-sticker="strawberry"]');
    await page.click('[data-slot="desk:0"]');
    await page.click('#stickerGrid [data-sticker="goose"]');
    let st = await store(page, KEYS.stickers);
    check("Stickers stored on their own", st.cards.s0 === "strawberry" && st.desk[0] === "goose");
    check("Stickers don't touch the capture records", !JSON.stringify(await capItems(page)).includes("strawberry"));
    const overlap = await page.$eval('[data-cap="s0"]', (cardEl) => {
      const slot = cardEl.querySelector(".sticker-slot").getBoundingClientRect();
      const hit = (r) => !(r.right <= slot.left || r.left >= slot.right || r.bottom <= slot.top || r.top >= slot.bottom);
      return [...cardEl.querySelectorAll(".cap-body, .cap-actions button, .src-chip, .cap-when")].some((el) => hit(el.getBoundingClientRect()));
    });
    check("Sticker spot doesn't cover text or buttons", !overlap);
    await page.reload();
    await page.click('.tab[data-tab="inbox"]');
    check("Scrapbook view remembered after refresh", (await page.$$("#inboxList .scrap")).length === 7);
    check("Stickers still there after refresh", !!(await page.$('[data-slot="card:s0"].filled')));
    await page.click('[data-slot="card:s0"]');
    await page.click("#stickerRemove");
    check("Sticker removed", !(await store(page, KEYS.stickers)).cards.s0);
    await page.uncheck("#decorToggle");
    check("Hide decorations hides stickers and ornaments", await page.isHidden("#deskStickers") && !(await page.isVisible(".sticker-slot")) && await page.isHidden("#headerDecor"));
    const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("Layout still fine with decorations hidden", ovf <= 0 && (await page.$$("#inboxList .scrap")).length === 7);
    await page.click('#inboxViewSeg [data-v="list"]');
    check("Back to List view", (await page.$$("#inboxList .cap")).length === 7);
    await page.click('#themeSeg [data-v="classic"]');
    check("Back to Classic Work", await page.getAttribute("body", "data-theme") === "classic");
    // Motivation
    await page.click('.tab[data-tab="notes"]');
    const m1 = await page.textContent("#motText");
    check("Daily motivation shows on today's page", await page.isVisible("#motivation") && m1.length > 5);
    await page.click("#motNext");
    check("'Another' changes the message", (await page.textContent("#motText")) !== m1);
    await page.click('#moodSeg [data-v="funny"]');
    check("Funny set is used", /chaos|backorder|folder numbers|Snacks|Adjusters|juggler/.test(await page.textContent("#motText")));
    await page.click("#motHide");
    check("Motivation can be hidden", await page.isHidden("#motivation"));
    check("...and stays hidden after refresh", (await page.reload(), await page.isHidden("#motivation")));
    check("Note entry still works with everything on", await (async () => { await page.fill("#noteEntry", "quick test line"); await page.click("#addNoteBtn"); return (await store(page, KEYS.notebook)).days["2026-11-02"].lines.length === 1; })());
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("v1.3 -> v1.4 migration, backups and damaged storage");
  {
    const notes = { version: 1, days: { "2026-10-30": { lines: [{ id: "l1", text: "10452 Jones - check bumper bracket order", at: "2026-10-30T14:00:00.000Z", block: "b", taskId: "t-bracket" }] } } };
    const imports = [{ id: "i1", at: "2026-10-30T14:00:00.000Z", date: "2026-10-30", src: "image", name: "notes.png", text: "10452 Jones - check bumper bracket order\nSmith called to schedule estimate Thursday", lines: 2 }];
    const notesRaw = JSON.stringify(notes);
    const page = await open(browser, { [KEYS.schema]: "3", [KEYS.tasks]: BASE_TASKS, [KEYS.notebook]: notesRaw, [KEYS.imports]: imports, [KEYS.settings]: { highlightMeans: "important", hideDone: true, view: "notes" } });
    check("v1.3 notes kept", (await store(page, KEYS.notebook)).days["2026-10-30"].lines[0].text === "10452 Jones - check bumper bracket order");
    check("v1.3 tasks kept", (await store(page, KEYS.tasks)).length === 4);
    check("v1.3 settings kept", (await store(page, KEYS.settings)).highlightMeans === "important" || await page.evaluate(() => document.querySelector('#hlMeaning [data-v="important"]').getAttribute("aria-pressed")) === "true");
    check("Copy of the v1.3 notebook kept", await page.evaluate((k) => localStorage.getItem(k), KEYS.preV14) === notesRaw);
    check("Storage version 4", await page.evaluate((k) => localStorage.getItem(k), KEYS.schema) === "4");
    const caps = await capItems(page);
    check("v1.3 import history became a Saved capture", caps.length === 1 && caps[0].status === "saved" && /Smith called/.test(caps[0].text));
    check("Old import history left untouched", (await store(page, KEYS.imports)).length === 1);
    check("Daily safety copy taken", !!(await store(page, KEYS.snapshot)));

    // Backup with captures, stickers, theme
    await page.click('.tab[data-tab="inbox"]');
    await page.click('#themeSeg [data-v="strawberry"]');
    await page.click('#inboxViewSeg [data-v="scrapbook"]');
    await page.click('#inboxFilter [data-v="saved"]');
    await page.click('#inboxList [data-slot^="card:"]');
    await page.click('#stickerGrid [data-sticker="cupcake"]');
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#exportBtn")]);
    const file = path.join(OUT, "backup-v4.json");
    await dl.saveAs(file);
    const b = JSON.parse(fs.readFileSync(file, "utf8"));
    check("v4 backup has captures, stickers and theme", b.version === 4 && b.captures.length === 1 && Object.values(b.stickers.cards)[0] === "cupcake" && b.settings.theme === "strawberry");
    await page.evaluate((k) => { localStorage.setItem(k.captures, JSON.stringify({ version: 1, items: [] })); localStorage.setItem(k.stickers, "{}"); }, KEYS);
    await page.reload();
    await page.setInputFiles("#importFile", file);
    await page.click("#confirmOk");
    check("Restore brings back captures and stickers", (await capItems(page)).length === 1 && Object.values((await store(page, KEYS.stickers)).cards)[0] === "cupcake");

    // v1.3 backup file imports (imports -> captures)
    const v13 = { app: "repair-advisor-planner", version: 3, tasks: BASE_TASKS.slice(0, 1), notebook: notes, settings: { highlightMeans: "done" }, imports: imports };
    const f13 = path.join(OUT, "backup-v1.3.json");
    fs.writeFileSync(f13, JSON.stringify(v13));
    await page.setInputFiles("#importFile", f13);
    await page.click("#confirmOk");
    check("v1.3 backup restores, its import history as captures", (await store(page, KEYS.tasks)).length === 1 && (await capItems(page)).length === 1);

    // Damaged storage falls back to the daily safety copy
    await page.evaluate((k) => localStorage.setItem(k, '{"version":1,"days":{"2026-10-30":{"lines":[{"id":"x","te'), KEYS.notebook);
    await page.reload();
    const recovered = await store(page, KEYS.notebook);
    check("Damaged notebook restored from the automatic copy", recovered && recovered.days["2026-10-30"] && recovered.days["2026-10-30"].lines.length === 1, recovered);
    check("Damaged data kept aside, not thrown away", await page.evaluate(() => Object.keys(localStorage).some((k) => k.indexOf("notebook.v1.corrupt.") !== -1)));
    check("No page errors", page.errors.length === 0, page.errors);
    await page.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("iPad: Capture Inbox and scrapbook, portrait and landscape");
  {
    for (const vp of [{ name: "ipad-portrait", width: 820, height: 1180 }, { name: "ipad-landscape", width: 1180, height: 820 }]) {
      const caps = ["sticky", "chat", "notebook", "appointment"].map((src, i) => ({
        id: "p" + i, at: "2026-11-02T1" + i + ":00:00.000Z", date: "2026-11-02", src: "image", source: src, sourceAuto: src, sourceConf: "likely",
        text: "Fictional line " + i + " for 10452 Jones", lines: [{ t: "Fictional line " + i + " for 10452 Jones" }], status: "review"
      }));
      const page = await open(browser, v14Seed({ [KEYS.captures]: { version: 1, items: caps }, [KEYS.settings]: { theme: "strawberry", view: "inbox", inboxView: "scrapbook" } }),
        { context: { viewport: { width: vp.width, height: vp.height }, hasTouch: true, deviceScaleFactor: 2 } });
      const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(vp.name + ": inbox has no sideways scrolling", ovf <= 0, ovf);
      const small = await page.$$eval("#inboxView button, .tab, #cameraBtn, #chooseImageBtn", (els) => els.filter((e) => e.offsetParent)
        .map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim() || e.getAttribute("aria-label"), Math.round(r.width), Math.round(r.height)]; })
        .filter((x) => x[1] < 44 || x[2] < 44));
      check(vp.name + ": inbox buttons at least 44px", small.length === 0, small);
      await page.tap('[data-cap="p0"] [data-cap-act="review"]');
      check(vp.name + ": tapping Review opens the review", await page.isVisible("#reviewPanel"));
      await page.screenshot({ path: path.join(OUT, "inbox-" + vp.name + ".png"), fullPage: false });
      check(vp.name + ": no page errors", page.errors.length === 0, page.errors);
      await page.context().close();
    }
  }
};
