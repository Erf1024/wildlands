
# Wildlands

A lightweight, low-poly first-person survival game built with HTML, CSS, JavaScript, and Three.js.

## Features

- First-person movement and mouse look
- Sprinting and jumping
- Low-poly forest with gatherable resources
- Wood, stone, fiber, and berries
- Health and hunger
- Inventory screen
- Day/night cycle
- Performance-conscious rendering

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look around |
| Shift | Sprint |
| Space | Jump |
| E | Gather resources |
| F | Eat berries |
| I | Open inventory |
| Esc | Pause / release mouse |

## Run locally

Requires Python 3.

1. Download or clone this repository.
2. Open a terminal inside the project directory.
3. Run:

   `python3 -m http.server 8000`

4. Open http://localhost:8000 in your browser.

An internet connection is needed to load Three.js from its CDN.

## Deploy

This is a static website and can be deployed to Cloudflare Pages using Direct Upload.

Upload the project files and deploy. The deployed website will receive a public URL.

## Current limitations

This is an early single-player prototype. Multiplayer, crafting, building, persistent saves, and PvP have not been implemented.

Real multiplayer requires a separate server or multiplayer backend. Never put private API keys or server secrets in browser JavaScript.
