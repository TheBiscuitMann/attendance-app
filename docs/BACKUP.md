# Database backups

The Neon Free plan retains about 6 hours of change history and has no scheduled
backups. That is an undo button, not a backup. `.github/workflows/db-backup.yml`
takes a `pg_dump` of production every night at 02:00 Bangladesh time, encrypts it,
and keeps it for 90 days as a workflow artifact.

Rosters and schedules can be rebuilt from source files if they are lost.
**Attendance records cannot** — nobody can re-take attendance for a class that
already happened. That is what this protects.

## One-time setup

### 1. Get the unpooled Neon connection string

In the Neon console, open the Prezence project → Connect. Choose the **direct /
unpooled** connection string, not the pooled one (the pooled host has `-pooler`
in it). `pg_dump` should not go through the connection pooler.

It looks like:

```
postgresql://USER:PASSWORD@ep-something.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Pick a passphrase and store it somewhere that is not this repo

Any long random string. A password manager, or written down. **If you lose it the
backups are unreadable** — that is the whole point of it not being in the repo.

### 3. Add both as repository secrets

GitHub → the repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret name | Value |
|---|---|
| `BACKUP_DATABASE_URL` | the unpooled Neon connection string from step 1 |
| `BACKUP_PASSPHRASE` | the passphrase from step 2 |

The workflow refuses to run if either is missing, so a half-finished setup fails
loudly instead of silently storing an unencrypted dump.

### 4. Run it once by hand

Actions tab → **Database backup** → Run workflow. It takes about a minute. When it
finishes, an artifact named `prezence-db-YYYY-MM-DD` appears at the bottom of the run.

### 5. Do a test restore now, not during an emergency

Follow the restore procedure below into a **new Neon branch**, and confirm the row
counts look right. An untested backup is a guess. Once you have done it once you
know it works, and you will not be learning the procedure on the worst day of the
semester.

## Restoring

### 1. Download and decrypt

Download the artifact from the Actions run and unzip it. Then:

```bash
gpg --batch --passphrase "YOUR_PASSPHRASE" \
  --decrypt prezence-2026-09-05.dump.gpg > prezence-2026-09-05.dump
```

### 2. Restore into a NEW Neon branch first

In the Neon console, create a branch (call it `restore-test`), and copy its
connection string. Restoring into a fresh branch means that if the backup turns
out to be the wrong date, or older than you thought, you have not overwritten
live data to find out.

```bash
pg_restore --no-owner --no-acl \
  -d "postgresql://...restore-test-connection-string..." \
  prezence-2026-09-05.dump
```

`pg_restore` must be the same major version as Neon's Postgres or newer. On Windows,
install the PostgreSQL client tools; the binaries are under
`C:\Program Files\PostgreSQL\<version>\bin`.

### 3. Check it, then promote

Point a local backend at the restored branch and look at it before switching
production over:

```
psql "CONNECTION_STRING" -c "SELECT count(*) FROM api_attendance;"
```

If it is right, either promote that branch in Neon or point `DATABASE_URL` on
Render at it.

## Things worth knowing

- **The workflow verifies before it stores.** It counts tables in the dump and
  fails the run if there are fewer than five, so an empty or truncated dump is
  never quietly saved as if it were fine.
- **Postgres version is detected at run time.** `pg_dump` refuses to dump a newer
  server than itself, so the workflow asks Neon what it is running and installs a
  matching client. If Neon upgrades Postgres, nothing needs changing here.
- **GitHub emails you when a scheduled run fails.** Do not ignore those. A backup
  job that has been failing for a month is the same as having no backups.
- **GitHub disables scheduled workflows after 60 days of no repository activity.**
  If the repo goes quiet over a semester break, check that the schedule is still
  running when you come back.
- **90-day retention.** After 90 days an artifact is deleted. If you want a
  permanent end-of-semester copy, download one and keep it somewhere yourself, or
  switch the upload step to an S3/R2 bucket.
- **The dump is encrypted**, so it is safe even if this repository is public.
  Do not remove that step — the dump contains teacher emails, password hashes,
  and every student's name and registration number.

## Changing the schedule

The cron line in the workflow is UTC. Bangladesh is UTC+6.

| You want | cron |
|---|---|
| Daily, 02:00 BST (current) | `'0 20 * * *'` |
| Twice daily, 02:00 and 14:00 BST | `'0 8,20 * * *'` |
| Weekly, Saturday 02:00 BST | `'0 20 * * 5'` |