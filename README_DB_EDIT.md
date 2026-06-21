# Editing the SQLite DB in VSCode (library.db)

This project uses **better-sqlite3** with the database file:

- `server/library.db`

## How to edit/view the DB

1. Make sure the app/server creates/has the DB file.
2. Open the database file in VSCode using a SQLite extension:
   - Install a VSCode extension like **SQLite** (or similar).
   - In VSCode: **File → Open File…** and select `server/library.db`.
3. If `server/library.db` doesn’t exist yet:
   - Run the server once (it will create the DB automatically via `server/db.js`).

## Notes / Schema

Tables created by `server/db.js`:
- `librarians`
- `books`
- `transactions`
- `reservations`

## Important warning

Edits to tables can break referential integrity if you change `books.id` etc. Prefer updating fields like availability/counters rather than primary keys.
