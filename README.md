# Repair Advisor Planner

A simple, private planner for tracking daily follow-ups and tasks in a collision repair shop.

**Version 1.0** · one file (`index.html`) · HTML, CSS and plain JavaScript · no accounts, no server, no tracking, no third-party code.

## What it does

- **Add a task** with an optional folder number, a description, a priority (Normal, High, Urgent), a due date (defaults to today) and a category (Parts, Supplements, Sublet, Customer, Scheduling, Delivery, Other).
- **Three sections:** Today, Upcoming and Completed.
- **Overdue tasks** stay at the top of Today with a red "Overdue" label and how many days late they are. Their original due date is never changed.
- **Mark done, reopen, edit or delete** tasks. Deleting always asks first.
- **Filter by category** and **find by folder number** (partial matches work).
- **Daily summary:** open, urgent, overdue and completed-today counts.
- **Backup:** export all tasks to a `.json` file, and import a backup later. Imports are checked first, and you are asked to confirm before your current tasks are replaced.
- **Add from notes or photo:** paste text (for example, copied from a photo or screenshot with the iPad's Live Text) and the app turns each line into a task. It guesses the folder number, category, priority and due date, and offers to update an open task with the same folder number and category. You review and adjust everything before it's saved. All reading happens on your device; nothing is uploaded.
- **Example tasks:** three fictional examples appear on first launch. Tap **Delete examples** to remove them; they won't come back.

## Where your data lives

Tasks are saved in the browser's local storage on the device you're using. They don't sync between devices, and clearing Safari's website data erases them. Use **Export backup** regularly.

## Run it

Open `index.html` in any modern browser. No install or build step.

## Testing checklist

1. Add a task with only a description. It should land in **Today**.
2. Add one dated tomorrow. It should land in **Upcoming**.
3. Add one dated yesterday. It should show in **Today** marked **Overdue · 1 day late**.
4. Mark a task done, then reopen it.
5. Edit a task, then delete one (confirm the prompt).
6. Type part of a folder number in **Find folder #**; tap a category chip; tap **Clear filters**.
7. Refresh the page. Everything should still be there.
8. **Export backup**, delete a task, then **Import backup** and confirm. The task should come back.
9. Paste these fictional lines into **Add from notes or photo**, tap **Read notes**, check the review, then add:
   ```
   RO 90452 call adjuster re supplement asap
   90461 bumper on backorder, ETA Fri
   #DEMO-101 front bumper cover arrived
   ```
   The last line should offer to update the DEMO-101 example task.
10. Tap **Delete examples**.

## How "Add from notes" reads a line

- **Folder #:** a number after RO, Folder, Job, WO or `#`, or a standalone 4–7 digit number (phone numbers, dates and years are ignored). A folder # on its own line applies to the lines below it until a blank line.
- **Category:** keyword matching, e.g. "adjuster" or "supplement" → Supplements, "backorder" or "bumper" → Parts, "alignment" → Sublet. Lines with no keywords become Other.
- **Priority:** "urgent", "asap", "rush" or "!!" → Urgent; "important", "priority" or "!" → High.
- **Due date:** "today", "tomorrow", a weekday ("Fri"), or a date like 11/4. Otherwise today.
- **Updates:** if an open task has the same folder # and category, the new note is added to the end of that task's description, and its priority and due date are updated when the note names them.

To teach it your shop's shorthand, add words to `CATEGORY_KEYWORDS` near the top of the script in `index.html`.

## Changing it later

All code is in `index.html`, in labeled sections:
- Colors are CSS variables at the top of the `<style>` block.
- Categories and priorities are lists at the top of the `<script>` block (`CATEGORIES`, `PRIORITIES`).
