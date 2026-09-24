# Chess Trainer

A home chess trainer for Addison Thurston: opening sprints, endgame drills, tactics, and a Stockfish bot. It is meant to sit behind a reverse proxy on addithurston.com.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43117. The dev server listens on `0.0.0.0:43117`.

`npm run dev` copies the bundled Stockfish lite engine into `public/engine` before it starts. If no system Stockfish binary is installed, the bot and the endgames still play through that browser engine. The strengths still differ (skill, depth, and think time).

Check the opening lines and puzzles:

```bash
npm run validate
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
docker compose up --build -d
```

The image installs Debian's Stockfish package and sets `STOCKFISH_PATH=/usr/games/stockfish`. The app listens on port 43117 inside the container.

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

Scores stay in the browser (`localStorage`). There are no accounts.
