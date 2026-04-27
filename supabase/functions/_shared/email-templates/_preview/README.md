# Filled email previews

HTML files here are **generated** — do not edit by hand.

From the repo root:

```bash
npm run preview:emails:db
```

That loads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase/.env.local` (or your environment), picks a **non-test, non-cancelled** booking (preferring one with **pets and parking**), and rewrites the templates with real field values.

Then start the static server (also runs the DB step):

```bash
npm run preview:emails
```

In the browser, open **`http://localhost:3334/`** and use the **“Filled from database”** links to `_preview/*.html`.

If the DB is unreachable or empty, the script falls back to a **built-in demo** row so layouts still render.
