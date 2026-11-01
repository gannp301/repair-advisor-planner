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
9. Tap **Delete examples**.

## Changing it later

All code is in `index.html`, in labeled sections:
- Colors are CSS variables at the top of the `<style>` block.
- Categories and priorities are lists at the top of the `<script>` block (`CATEGORIES`, `PRIORITIES`).
