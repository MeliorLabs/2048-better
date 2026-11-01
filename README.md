<div align="center">

# 🎮 2048 Better

**The classic 2048 puzzle, rebuilt with undo, phone swipes, and a clean dark theme.**
Plain HTML, CSS and JavaScript. No libraries. No installs.

<br>

[![Play Now](https://img.shields.io/badge/▶_PLAY_NOW-2563eb?style=for-the-badge&logoColor=white)](https://meliorlabs.github.io/2048-better/)

<br>

![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

---

## ✨ Features

- 🎚️ **6 modes:** Easy, Classic, Hard, Nightmare (two tiles spawn every move, no power-ups), Time Attack (2 min), and a Daily board that's the same for everyone
- 🤖 **Challenge the bot:** race an AI on its own board at three skill levels (Rookie, Pro, Genius)
- 🔨 **Power-ups:** undo, swap two tiles, remove a tile, shuffle the board
- 🔥 **Combos:** chain merges back to back for bonus points, with screen shake on big merges
- 🎨 **6 themes:** Cream, Midnight, Ocean, Neon, Forest, Sunset
- 🏆 **Leaderboard:** your top 10 scores, saved on your device
- 📐 **Board sizes:** 4×4, 5×5, 6×6
- 🎵 **Chill music:** a lo-fi coffeeshop radio with 4 songs, beats, vinyl crackle and rain, generated live in your browser (no audio files), with a Now Playing bar, pause, and next
- 📱 **Swipe, keyboard, and sound/effects settings**
- ⚡ **Zero dependencies:** one HTML, one CSS, one JS file

## 🕹️ How to play

Slide the tiles. When two tiles with the same number touch, they **merge** into one. Reach the **2048** tile to win.

| Action | Keyboard | Phone |
|---|---|---|
| Move | Arrow keys or `W` `A` `S` `D` | Swipe |
| Undo | `Ctrl` / `Cmd` + `Z` | Undo button |
| Restart | New game button | New game button |

## 🚀 Run it yourself

**Easiest:** download the repo and open `index.html` in your browser. That's it.

Or with git:

```bash
git clone https://github.com/meliorlabs/2048-better.git
cd 2048-better
# then open index.html
```

## 📁 Project structure

```
2048-better/
├── index.html   # the page
├── style.css    # colors, layout, animations
├── script.js    # all the game logic
├── README.md
└── LICENSE
```

## 🧠 How it works

All four directions share one function. The board is flipped or rotated so every move becomes "slide left," then flipped back. That keeps the logic short and easy to read. See `slide()` and `move()` in `script.js`.

## 🗺️ Roadmap

- [x] Undo
- [x] Swipe controls
- [x] Saved best score
- [ ] Save the game in progress
- [ ] Bigger boards (5×5, 6×6)
- [ ] Light theme toggle
- [ ] Sound effects

Ideas or bugs? [Open an issue](https://github.com/meliorlabs/2048-better/issues).

## 🙏 Credits

Inspired by [2048](https://github.com/gabrielecirulli/2048) by Gabriele Cirulli. All code in this repo is written from scratch.

## 📄 License

[MIT](LICENSE). Free to use, change, and share.
