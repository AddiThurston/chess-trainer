# Tabiya (chess-trainer)

A chess trainer for Addison Thurston: opening courses stored as move trees, opening sprints, endgame drills, tactics, and a Stockfish bot. It is meant to sit behind a reverse proxy on addithurston.com. The plan for the course features is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run locally

Courses, accounts, and imports need Postgres. Sprints, endgames, tactics, and the bot run without it.

```bash
npm install
export DATABASE_URL=postgres://chess:change-me@127.0.0.1:5432/chess
export ADMIN_USERNAME=addi ADMIN_PASSWORD=change-me-too
npm run dev
```

The tables are created on the first database query, and the admin account is created from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if it does not exist yet.

Lichess imports run in a separate worker process. Start it in a second terminal with the same `DATABASE_URL`:

```bash
npm run worker
```

Open http://127.0.0.1:43117. The dev server listens on `0.0.0.0:43117`.

`npm run dev` copies the bundled Stockfish lite engine into `public/engine` before it starts. If no system Stockfish binary is installed, the bot and the endgames still play through that browser engine. The strengths still differ (skill, depth, and think time).

Check the opening lines and puzzles, and the PGN move-tree round trip:

```bash
npm run validate
npm run test:tree
npm run test:inputs
```

Production, without Docker:

```bash
npm run build
npm start
```

## Stockfish

The server looks for a native engine in this order:

1. `STOCKFISH_PATH` (an absolute path to the binary)
2. `stockfish` on `PATH`
3. `/usr/games/stockfish` or `/usr/bin/stockfish`, if one of those files exists

The `stockfish` command inside `node_modules` is the bundled browser engine, so the server skips it. Install the system package when you want the stronger native engine.

```bash
sudo apt install stockfish
export STOCKFISH_PATH=/usr/games/stockfish
npm start
```

If the binary is missing, the UI says so and keeps playing with the bundled engine. Endgame replies fall back to a small built-in policy if both the binary and the browser engine fail.

Bot strengths map to real UCI limits:

| Strength   | Skill | Depth | Movetime | Limit strength |
| ---------- | ----: | ----: | -------: | -------------- |
| Beginner   |     0 |     1 |     80ms | Elo 1320       |
| Casual     |     4 |     4 |    140ms | Elo 1450       |
| Club       |    10 |     8 |    280ms | Elo 1750       |
| Tournament |    16 |    12 |    500ms | Elo 2200       |
| Master     |    20 |    16 |    900ms | off            |

## Docker

```bash
cp .env.example .env   # then set the three passwords and names in it
docker compose up --build -d
```

Compose runs the app, the import worker, and Postgres 17. Two named volumes hold the database (`db-data`) and the raw PGN that the worker fetched from Lichess (`lichess-cache`). The image installs Debian's Stockfish package and sets `STOCKFISH_PATH=/usr/games/stockfish`. The app listens on port 43117 inside the container.

## Importing from Lichess

Sign in as the admin and open Import. Paste study links, study IDs, and usernames in any mix, or upload a text file of them, and set which titles to keep. The worker fetches one thing at a time, and the progress page shows what was skipped and why. When it finishes, Chapters lists every chapter with its opening and side: tick some and merge them into one course, or make one course per chapter. Imported courses stay private until you record the author's permission under Authors.

The opening names come from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0), copied into `data/openings`.

## Reverse proxy

Point the public site at the app. The trainer does not terminate TLS itself.

Caddy:

```caddy
addithurston.com {
	reverse_proxy 127.0.0.1:43117
}
```

nginx:

```nginx
server {
	server_name addithurston.com;

	location / {
		proxy_pass http://127.0.0.1:43117;
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

Sprint and tactic scores stay in the browser (`localStorage`). Courses live in Postgres. Only the admin account exists so far; sign-up comes with the accounts milestone.
