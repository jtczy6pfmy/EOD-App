# EOD-App

An iPad-friendly daily inspection log for chassis, containers and chassis racks.

## Daily workflow

Choose a terminal, select the equipment tab and add inspections. Reports are saved
locally per terminal and day. The cloud icon is amber while backup is pending and
green with a check mark only after the current report is confirmed in the cloud.
Offline or failed backups remove the check mark; tap the icon to retry.

Edits retain inspection IDs. Deleted inspections retain versioned tombstones in
the backup, preventing an older copy from bringing them back. Tire audit totals
and notes use versioned replacements, so reducing a count or clearing notes works.
Concurrent cloud updates use conditional revision checks and retry after merging.
If two devices change the same field, the later logical timestamp wins, with a
client-ID tie breaker. Independent inspection changes are combined.

Existing daily local and cloud reports are migrated on read. The original v13
local report remains untouched as a recovery copy. No database schema migration
is required; metadata lives inside the existing `app_state` JSON column.

After deploying, reload the app on every device before continuing work. Older app
copies do not understand correction metadata and can overwrite newer backups.
The existing publishable key and database access policies are unchanged. Database
administration and policy verification require access to the app's Supabase project.

## Validation

Run `node --test tests/report-state.test.js` for merge and validation regressions.
With Playwright installed, run `node tests/ipad.test.cjs` for browser workflow tests.
Set `EOD_BROWSER_CHANNEL=msedge` to use installed Edge, or leave unset for Chromium.
`EOD_PLAYWRIGHT_MODULE` can point to an existing Playwright installation.
`EOD_SCREENSHOT` optionally saves the verified iPad-size screen.

Browser tests intercept cloud requests; they do not modify production reports.
They cover tab navigation, touch layouts at portrait/landscape/split-screen sizes,
cloud status, editing, deletion recovery, duplicates, offline entries, pending
uploads, competing writers and terminal isolation. Actual iPad Safari verification
should follow deployment.
