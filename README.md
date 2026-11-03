# Dasa Fun World

Free browser games for phone and computer — **https://dasev.publicvm.com/**

Every game runs right in the browser: no download, no sign up. Most of them keep working offline after the first visit.

## Games

| Game | Type | Play |
|---|---|---|
| Kite Wars: Uttarayan | Action, Story | [games/kite-wars/](games/kite-wars/) |
| Village Fair (गाँव का मेला) | Kids, Story, Arcade | [games/village-fair/](games/village-fair/) |
| Chandrayaan | Space, Adventure | [games/chandrayaan/](games/chandrayaan/) |
| Vyapar | Board | [games/vyapar/](games/vyapar/) |
| Samudrayaan: The Deep | Story, Adventure | [games/samudrayaan/](games/samudrayaan/) |
| Robo Rakshak 2050 — Demo | Action | [games/robo-rakshak/](games/robo-rakshak/) |
| The Ant's Hard Work — Demo | Kids | [games/ant-work/](games/ant-work/) |
| Meteor Dash | Arcade, Space | [games/meteor-dash/](games/meteor-dash/) |
| ECHOES | Arcade | [games/echoes/](games/echoes/) |

Vyapar is an online multiplayer board game: the pages live here, and the game rooms run on the Vyapar game server.

## How the site is built

- `index.html` — the portal (search, categories, featured games, full-screen player)
- `assets/` — styles, scripts, fonts, logo and game pictures
- `assets/js/splash.js` — the colourful "splash cursor" fluid effect that follows the mouse and the finger (WebGL, adapted from the MIT-licensed WebGL Fluid Simulation by Pavel Dobryakov), with a sparkle fallback
- `games/<name>/` — each game in its own folder, with its own offline support
- `sw.js`, `manifest.webmanifest` — makes the portal installable as an app
- `CNAME` — the custom domain `dasev.publicvm.com`

Plain HTML, CSS and JavaScript. No build step: GitHub Pages serves the `main` branch as it is.

© 2026 Dasa Fun World
