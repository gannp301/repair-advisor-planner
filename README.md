# Repair Advisor Planner

A simple, private daily notebook and task board for a collision repair advisor.

**Version 1.4 — Smart Capture & Strawberry Cottage** · one file (`index.html`) · HTML, CSS and plain JavaScript · no accounts, no server, no tracking.

Write notes the way you already do, all day long, and capture everything else: sticky notes, notebook pages, scraps of paper, Teams chats, emails. When you have a minute, let the planner suggest what's a follow-up, what's an appointment, what's just information, and what looks finished. Nothing changes until you approve it.

## New in 1.4

- **Capture Inbox** (new tab): **Take photo**, **Choose images** (several at once), drop/paste a screenshot, or paste/type a note. No categories, dates or statuses to pick first.
- **Source recognition:** each capture is labelled *Sticky note, Handwritten notebook, Loose paper / envelope, Email, Teams / chat, Digital notes, Appointment, Typed note* or *Other*, with **Likely / Maybe / Not sure** and the reason. Change it with one tap if it's wrong.
- **Smarter sorting:** besides follow-up / appointment / info, lines get a topic (*Accident details, Customer concern, Parts, Supplement, Repair status*), and a co-worker's name ("Derek confirmed…") is shown but kept out of task matching.
  - Email/chat header lines (From/To/Sent, "Derek Miller 10:42 AM", signatures) stay in the capture and aren't added to your notes.
  - An email or chat saying something was handled suggests **linking it as a status update**; the task stays open. Completing a task always needs its own approval.
- **New review action:** *Keep in Capture Inbox only* (no note, no task). The full list: add as open task, save to daily notes, save as appointment info, link to an existing task (status update), mark an existing task complete, save as reference info, keep in inbox only, skip.
- **Inbox views:** Needs review · Saved · Linked · Archived; search by folder #, customer or any word (all views); archive/restore; delete (asks first). Cancelling a review keeps the capture in *Needs review*.
- **One record per capture.** Re-capturing an updated screenshot (same day) updates the existing record; lines you already handled don't come back, newly crossed-out lines do.
- **Strawberry Cottage** look (Appearance card): soft pink, cream, cocoa and butter yellow, original pixel-art strawberry, goose and sleeping cat. **Classic Work** (red/white/black) is still the default.
- **Scrapbook view** of the inbox: sticky notes with tape, envelope-style emails, chat bubbles, lined notebook paper, torn scraps, calendar-style appointments. It's only a different way of drawing the same records; the text stays real, searchable text. List or Scrapbook is remembered.
- **12 original stickers** (strawberry, bow, cupcake, cookie, sleeping cat, paw, goose, daisy, coffee, star, heart, flower) in fixed sticker spots: one per scrapbook card and six on the "desk". Tap a spot to add, change or remove. Stored separately from your notes and tasks.
- **Show decorations and stickers** can turn all of it off at once.
- **Daily motivation** on today's notes page: sweet, funny or encouraging; tap *Another* or *Hide*.
- **Safety:** an automatic once-a-day copy of everything is kept on the device and used if saved data is ever found damaged; every save is read back to check it was stored completely.

## Daily notes (opens first)

- **One page per day**, dated automatically. Today's page is always there; earlier pages exist once you write on them.
- **Just write.** No due dates, priorities or statuses. Return starts a new line; **Add to page** (or Ctrl/⌘+Enter) saves. Lines keep your wording and the order you wrote them. Lines written together stay grouped, with the time.
- **Each line on its own:** tap the box to **check it off**, tap the yellow swatch to **highlight** it, tap the text (or **⋯**) to edit it, mark it as a follow-up, appointment or *just info*, or make it a task.
  - **Highlighter** mode: tap lines to highlight them, like running a marker down the page.
  - Editing keeps the **original wording** (shown in the line's details).
- **Hide done** hides checked lines (and highlighted lines, if highlights mean done). Done lines are never deleted.
- **Highlighted lines mean:** choose **Done**, **Important** or **Nothing**. A highlight doesn't have to mean finished.
- **Previous days:** ‹ › step through workdays (weekends are skipped unless you wrote on them), or use **Go to date**. Past pages can be edited.
- **Unresolved** tab: open lines from earlier days, oldest first. Lines that look like info or appointments are listed separately. Nothing is copied onto today's page. Tap **Just info** to clear a line that never needed action.
- **Find in notes:** search every page by folder #, name or word.
- **Appointments:** a line saved as an appointment can hold a date and time. The day's page lists appointments noted for it. *Nothing is booked in Nexsyis, Body Shop Booster or any calendar.*
- Unsaved text in the writing box survives a refresh.

## Smart import

Import from the **Capture** card (on every tab; called *Import notes* in v1.3):

- **Screenshots or photos:** drop, paste (Ctrl/⌘+V) or **Choose image**. Several at once is fine.
- **Pasted text:** one note per line.
- **Lines already on a page:** **Suggest tasks** on a notes page, or **Make it a task…** on a single line.

Each line is sorted into:

| Type | Example | Suggested action |
|---|---|---|
| **Follow-up** | `10518 - follow up with parts on mirror ETA` | Create an open task (no due date) |
| **Appointment** | `Smith called to schedule estimate Thursday at 9:30` | Save as appointment; no task |
| **Info** | `Lee rear ended at light, cust states no injuries` | Save as info |
| **Looks done** | crossed out / checked / highlighted (if highlights mean done), or "done", **and** it matches an open task | Mark that task complete (**needs your approval**) |
| **Unsure** | unreadable or mixed signals | You decide |

It uses the same smart reader as before (folder #, customer, estimator, category, shorthand like *supp*, *f/u*, *lvm*).

**Appointment dates:** "Thursday" becomes the next Thursday after the day the note was written, marked *check it*. "Next Tuesday", or a weekday the same as the note's own day, is left blank because it's ambiguous. A time without AM/PM is assumed from shop hours (7–11 AM, 12–6 PM) and flagged. Nothing is "confirmed" unless the date and AM/PM are written out.

### Matching to open tasks

- **Folder #** is the strongest signal. A different folder # never matches.
- **Customer name**, then **similar wording**. Common words (*call, check, customer, parts, follow up…*) don't count, so "call customer" never matches "call customer".
- Each match is **High**, **Medium** or **Low** confidence, with the reasons shown ("Same folder # · Same words: bumper, bracket").
- If two tasks are equally close (for example, two open tasks on the same folder), neither is called High and you pick.
- A folder # one digit off (a common OCR misread) is offered with that warning, never as High.
- You can always pick a different task, or **None of these**.

### Review before anything changes

Each suggestion shows the original line (plus a picture of it, for screenshots), the type, the action, the matched task and confidence, any marks or uncertainty, and editable fields. **Approve** or **Skip** each one, or use **Approve all suggested**. That never approves task completions; those need their own tap. Then **Apply**.

Nothing is saved, completed, merged or deleted before **Apply**. Task completions always need your explicit approval.

### Importing the same notes again

Take as many screenshots of the same page as you like through the day:

- Lines already on that day's page are recognized (even with small OCR differences) and left alone. They're listed under "no change".
- A line that is **now** crossed out, checked or highlighted suggests completing **its** task, or marks the line done. It doesn't create a second copy.
- New lines are offered as new.
- Lines that look similar but not certainly the same, or that appear on another day's page, are flagged for you to decide.
- Existing lines keep their original time and wording.

## Source recognition (how it works, and its limits)

Everything happens on your device. No image or text is sent anywhere, and there's no AI service. The app uses rules of thumb, and always shows how sure it is:

- **Email:** header lines like `From:`, `To:`, `Subject:`, `Sent:` (two or more = *Likely*).
- **Teams / chat:** lines like `Derek Miller 10:42 AM` (two or more = *Likely*).
- **Appointment:** several appointment words (*appointment, confirmed, scheduled, drop-off, estimate…*) with a day or time.
- **Photo or screenshot?** In a screenshot one background color covers most of the image; in a photo light and grain spread it over many shades.
- **Sticky note:** a photo where pastel paper (yellow, pink, green, blue…) fills most of the picture.
- **Handwritten notebook:** a photo with evenly spaced ruled lines (even if the photo is a little crooked).
- **Loose paper / envelope:** a photo of light-brown paper, or a photo of paper whose text is hard to read.
- Otherwise *Digital notes* (screenshot), *Typed note*, or *Other / Not sure*.

Tested on browser-drawn stand-ins (a tilted sticky note "photo", a lined-paper "photo" in a slanted font, an email and a Teams-style screenshot); all four were recognised and read at 95%+. **Real phone photos and real handwriting will do worse.** Tesseract.js reads print far better than handwriting: messy handwriting, pencil, low light, glare, a palm, or a note on a busy desk will often come back garbled or as "No readable text". Nothing is ever invented — unreadable text stays unreadable, and the source type falls back to *Other / Not sure* for you to set.

Handwritten lines that wrap ("10452 Jones -" / "check bumper" / "bracket ETA") are joined back into one note for sticky notes, notebook pages and scraps only.

## Highlighter and cross-out recognition (how it works, and its limits)

The text reader (Tesseract.js) only reads letters. It can't tell whether a line is highlighted or crossed out, and in testing it **skipped highlighted lines entirely** and **garbled crossed-out ones**. So before reading, the planner looks at the image itself on a `<canvas>` on your device:

1. It finds the page background (the most common color). Light and dark mode both work.
2. It sorts pixels into background, text, or **marker color** (bright, saturated: highlighter).
3. It finds **long horizontal strokes** (strike-throughs), including slightly slanted pen lines.
4. It makes a clean black-on-white copy with marker color and strokes removed, and keeps letters where a stroke crosses them. That copy is what gets read, which brings highlighted and crossed-out lines back.
5. For each line the reader finds, it checks for marker color across the text, a stroke through the middle (not an underline), or a filled checkbox to the left (like Apple Notes checklists).

Each mark is reported as **likely** or **unclear**, never certain. Unclear marks and low-confidence text are flagged, and those suggestions aren't pre-approved. What a screenshot showed is stored separately from whether you checked the line off.

**Works well:** screenshots of typed notes (Notes, OneNote and similar apps) with highlighter color, strike-through or checklist circles, in light or dark mode.

**Experimental / limited:**
- **Handwriting** and photos of paper: OCR is often poor. Marks may still be seen, but the text will usually need fixing in the review.
- **Crossed-out text is harder to read.** Expect occasional misreads (in testing, `10518` came back as `10513`). Fix the text in the review; folder #s one digit off are flagged.
- Thin, faint or very short marks, partial highlights, circled text, arrows, and colors close to the page background may be missed or shown as *unclear*.
- Gray "completed" text, emoji and handwritten check marks are not recognized as marks.
- Multi-column layouts or tables may be read out of order.

## Task board (unchanged from v1.2, now a tab)

Smart fill, Today / Carried over / Completed, mark done, reopen, edit, delete, search, category and estimator filters, daily summary, example tasks, and keyboard shortcuts all work as before. New: a task made from a note shows *From daily notes, \<date\>*, and the latest history line (for example *Completed from daily notes…*).

## Privacy and security

- **Screenshots and photos are not stored.** A capture keeps the text that was read, the source type and links to notes/tasks. The picture is kept only in memory while you review it.
- **Optional:** *Keep a small picture of each capture* (off by default) saves a small, low-quality copy on this device. Pictures can show customer details. *Delete saved picture* (per capture) and *Delete all saved pictures* remove them. They're included in backups while they exist.
- Stickers, theme and motivation are decoration only and never change notes, tasks or captures.

- Notes, tasks, settings and the import history are saved in this browser's **local storage** on this device. They don't sync between devices; clearing the browser's website data erases them. **Export a backup regularly.**
- No AI services, analytics, telemetry or uploads.
- **Reading images:** the first time you read an image, the browser downloads Tesseract.js 5.1.1, its engine and English data (several MB) from **cdn.jsdelivr.net**, at pinned versions. The main script is checked against a fixed SRI hash. That first time needs internet; afterwards the browser usually has the files cached, but offline use isn't guaranteed (the cache can be cleared). Reading happens **inside your browser** (a Web Worker). **The image is not uploaded** and is **not saved**. It's kept in memory only while the review is open. The *text* read from it is saved with the capture in the **Capture Inbox** (so you can check it later), and each capture can be deleted.
- Everything imported is shown as plain text (escaped), never as HTML.
- Pasted text and typed notes never leave the device.

## Your data, versions and backups

**v1.4 changes** (storage version 4):
- New: `captures.v1` (Capture Inbox), `stickers.v1` (sticker spots), `dailySnapshot` (automatic daily safety copy).
- First run of v1.4 keeps an untouched copy of the v1.3 notebook under `repairAdvisorPlanner.notebook.v1.beforeV1_4`, and turns each v1.3 *Import history* record into a *Saved* capture (the old history is left in place too).
- Notes and tasks are not converted; v1.3 can still read them (it ignores the new `captureId` / `topic` fields on note lines).
- Backups are now version 4 and include captures, stickers and appearance settings. v1.3, v1.0–v1.2 and bare task-list backups still import.
- Damaged saved data is kept aside (`….corrupt.<time>`) and replaced by the automatic daily copy when there is one.
- Browser storage holds about 5 MB. Text captures are small; saved pictures are not. A warning appears in the inbox above about 3.5 MB.

**Earlier versions:**

- Tasks stay under the same storage key as v1.0–v1.2, in the same shape, so nothing about them is converted. v1.3 adds optional fields (`noteRef`, `log`) that older versions simply ignore.
- New in v1.3: `notebook.v1` (pages), `settings.v1`, `imports.v1` (import history) and `schemaVersion` = 3.
- **First run of v1.3** keeps an untouched copy of your v1.2 task list under `repairAdvisorPlanner.tasks.v1.beforeV1_3`.
- **Export backup** (version 3) contains tasks, all notes, settings and import history.
- **Import backup** accepts v3/v4 backups (replaces tasks **and** notes), and v1.0–v1.2 backups or a bare task list (replaces **tasks only**; your notes are kept). Backups are checked before anything changes, and you confirm first.
- **Undo last backup import** puts back exactly what you had before the last restore.

## Run it

Open `index.html` in Safari, Chrome or Edge. No install or build step. On iPad, Share → *Add to Home Screen* gives it its own icon.

## iPad testing checklist for v1.4 (fictional data only)

1. **Capture Inbox → Take photo** of a fictional sticky note (e.g. "10452 Jones – check bumper bracket ETA"). Check the source says *Sticky note*, the text, and *Add as an open task*.
2. Photograph a fictional lined notebook page and a scrap of paper. Note how well your handwriting is read and whether the type is right; correct it with *Wrong? Source type*.
3. Screenshot a fictional Teams message ("Derek confirmed bracket was ordered yesterday") and a fictional email ("Smith confirmed estimate Thursday at 9:30 AM"). Check *Teams / chat* → link as status update (task stays open), *Email* → appointment info, and that names/times/From lines aren't added to notes.
4. Choose *Keep in Capture Inbox only* for one line; check no note or task was added and it shows under *Saved*.
5. Skip a suggested completion; the task stays open.
6. Capture the same screenshot again: nothing new is suggested and the inbox still has one card.
7. Search the inbox for a folder # and a name; archive a card, find it under *Archived*, restore it.
8. Appearance: switch to **Strawberry Cottage**, open the inbox in **Scrapbook**, add and remove a sticker, turn decorations off and on, try the motivation styles.
9. Rotate the iPad (portrait/landscape) on the inbox and the review. Everything should fit without sideways scrolling.
10. Export a backup, delete a capture, import the backup: it comes back.

## User testing checklist (fictional data only)

1. **Write a day:** add a few lines in two or three goes. Highlight one, check one off, edit one (its original wording is kept). Refresh: everything's still there.
2. **Hide done**, then show again. Try **Highlighter** mode.
3. **Previous days:** ‹ to go back, add a line to an earlier day. Today's page doesn't change.
4. **Unresolved:** open lines from earlier days are listed; tap **Just info** on one.
5. **Highlighted lines mean:** switch between Done / Important / Nothing and watch Unresolved change.
6. **Paste text** into the Capture card and tap **Capture**:
   ```
   ~~10452 Jones - check bumper bracket order~~
   Smith called to schedule estimate Thursday at 9:30
   10518 - follow up with parts on mirror ETA
   Lee rear ended at light, cust states no injuries
   ```
   (First add a task: folder 10452, customer Jones, "Verify bumper bracket was ordered".) Check that line 1 suggests completing that task and **isn't pre-approved**, line 2 is an appointment for Thursday (not confirmed, no task), line 3 creates an open task for 10518, and line 4 is info. **Skip** line 1, Apply: the task is still open.
7. **Same text again:** nothing new is suggested.
8. **Screenshot:** type the lines above in your Notes app, highlight one and strike through another, take a screenshot and drop/paste/choose it. Look at the picture of each line, the marks found, and the confidence. Approve the completion this time.
9. **Updated screenshot:** add a new line in Notes, cross out another, and screenshot again. Only the new and newly marked lines are offered.
10. **Suggest tasks** on a page; **Make it a task…** from a line's ⋯ menu.
11. **Task board:** search, filter, mark done, edit, delete, add with smart fill.
12. **Export backup**, delete a line and a task, **Import backup**, confirm. Both come back. Try **Undo last backup import**.
13. **iPad:** portrait and landscape; tap check boxes, highlight swatches and ⋯; type with the on-screen keyboard.

## Automated tests

`tests/run-tests.js` (with `tests/capture-tests.js` for v1.4) drives the real page in Chromium (Playwright). v1.4 adds: sticky-note, email, Teams and handwritten-style captures with real OCR, correcting a source, keep-without-task, linking a status update, rejecting a completion, re-capturing, inbox views/search/archive/delete, saved-picture opt-in, both themes, list/scrapbook, stickers, hidden decorations, motivation, v1.3 → v1.4 migration, v4 backups and recovery from damaged storage, and iPad layouts. v1.3 covers: notes, highlighting, refresh, past days, unresolved, text and **real-OCR screenshot** imports with visual marks, matching and confidence, rejecting a completion, duplicate prevention, ambiguous and misread OCR, v1.2 migration, backups (v3, v1.0, bare list, bad files, undo), escaping, and iPad/phone layouts. The OCR files are served from `tests/node_modules`, so tests run offline.

```
cd tests && npm install && npx playwright install chromium && cd ..
node tests/run-tests.js
```

## How the smart reader works

Everything runs on your device; nothing is sent anywhere.

- **Folder #:** a number after RO, Folder, Job, WO or `#`, or a standalone 4–7 digit number. Phone numbers, dates and years are skipped.
- **Customer last name**, most certain first: a name you've used before; a label ("Cust:", "Owner:", "Insured:"…); "Mr./Mrs./Ms. Rivera"; a heading line like `RO 90452 RIVERA` (applies to the lines under it until a blank line); **a name before a dash after a folder #, like `10452 Jones - …`** (new in 1.3); or a guess (outlined in red).
- **Estimator:** "Est: Name", or any estimator name you've used before.
- **Category:** keywords, e.g. "adjuster" or "supp" → Supplements, "backorder" or "bumper" → Parts.
- **Clean wording:** shop shorthand expanded (supp, vm, lvm, b/o, p/u, f/u, re, tmrw, w/…), ALL-CAPS made readable.

**Teach it your shop's words** (near the top of the script in `index.html`): `CATEGORY_KEYWORDS`, `SHORTHAND`, `NOT_NAMES`. The import sorting words are at the start of section 10 (`FOLLOWUP_START`, `APPT_WORDS`, `REF_WORDS`, `MATCH_STOP`).
