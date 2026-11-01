# Repair Advisor Planner

A simple, private planner for tracking daily follow-ups and tasks in a collision repair shop.

**Version 1.1** · one file (`index.html`) · HTML, CSS and plain JavaScript · no accounts, no server, no tracking.

## What it does

- **Add a task** with a customer name and/or folder number, what needs doing, a category (Parts, Supplements, Sublet, Customer, Scheduling, Delivery, Other) and an optional estimator. Each task is stamped with the date it was added.
- **Three sections:** Today (added today), Carried over (still open from earlier days, oldest first) and Completed. Open tasks show how many days they've been waiting; 3 days or more turns red.
- **Mark done, reopen, edit or delete** tasks. Deleting always asks first.
- **Find** by folder number or customer, and **filter** by category or estimator.
- **Daily summary:** open, added today, waiting 3+ days, and completed today.
- **Add from notes or snippets:**
  - On a computer, **drag and drop** a screenshot or snippet onto the page, or **paste** one (Ctrl+V / Cmd+V) right after snipping it.
  - On iPad or iPhone, tap **Choose image** to pick a photo or screenshot, or copy text with Live Text and paste it.
  - You can also type or paste text directly.
  - The app reads the text, turns each line into a task, guesses the folder #, customer, category and estimator, and offers to update matching open tasks. You review everything before it's saved.
- **Backup:** export all tasks to a `.json` file and import it later. Imports are checked first, and you confirm before your current tasks are replaced. Backups from v1.0 still import.
- **Example tasks:** three fictional examples appear on first launch. Tap **Delete examples** to remove them.
- **Desktop:** three task columns side by side on wide screens, plus keyboard shortcuts: `N` new task, `/` search, `Esc` cancel, `Ctrl+Enter` in the notes box to read notes.

## Privacy

Tasks are saved in the browser's local storage on the device you're using. They don't sync between devices, and clearing the browser's website data erases them. Use **Export backup** regularly.

Reading text from images uses [Tesseract.js](https://github.com/naptha/tesseract.js), which runs inside your browser. The first time you read an image, the browser downloads the reader (a few MB) from jsDelivr, so that first time needs an internet connection. **Your images are never uploaded.** This is the only outside code the app uses, and it only loads when you read an image.

## Run it

Open `index.html` in Chrome, Edge or Safari. No install or build step.

## Testing checklist

1. Add a task with only a customer name and a task. It lands in **Today** with today's date.
2. Add one with a folder # and an estimator. The estimator is filled in for your next task.
3. Check **Carried over**: the example from 4 days ago shows **Waiting 4 days** in red.
4. Mark a task done, then reopen it. Edit one, then delete one.
5. Search by part of a customer name, then by part of a folder #. Try a category chip and the estimator menu, then **Clear filters**.
6. Refresh the page. Everything should still be there.
7. Take a screenshot or snippet of some typed notes (fictional), then drop or paste it onto the page. Review and add.
8. Paste these fictional lines into the notes box and tap **Read notes**:
   ```
   RO 90452 Rivera
   call adjuster re supplement
   bumper on backorder

   Cust: Ann Lee 90470 sublet alignment
   ```
9. **Export backup**, delete a task, then **Import backup** and confirm. The task comes back.
10. Tap **Delete examples**.

## How notes and snippets are read

- **Folder #:** a number after RO, Folder, Job, WO or `#`, or a standalone 4–7 digit number. Phone numbers, dates and years are skipped.
- **Customer:** a name after "Cust:", "Customer:", "Owner:" or "Name:", or a name on the same line as a folder #, like `RO 90452 Rivera`.
- **Groups:** a line with just a folder # and/or name applies to the lines under it, until a blank line.
- **Category:** keywords, e.g. "adjuster" or "supplement" → Supplements, "backorder" or "bumper" → Parts, "alignment" → Sublet. No keywords → Other.
- **Estimator:** "Est: Name", or any estimator name you've used before. Otherwise your current estimator.
- **Updates:** a line with the same category as an open task, and the same folder # (or the same customer when there's no folder #), is offered as an update. The note is added to that task.

To teach it your shop's shorthand, add words to `CATEGORY_KEYWORDS` near the top of the script in `index.html`.
