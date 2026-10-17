# Local data

This directory is the default persistence boundary for local development. Runtime JSON
files may be created here by server-side code and are ignored by git. Keep storage
access behind a small server-only repository module so route handlers and UI code do
not read files directly.

Use stable, plural filenames for collections (for example `brands.json` and
`evaluations.json`). Each collection should contain a JSON array and be safe to
recreate when missing. Do not put secrets in this directory; use environment
variables for credentials such as `JEV_API_KEY`.
