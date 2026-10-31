<div align="center">

# 🎮 2048 Better

**The classic 2048 puzzle, rebuilt with undo, phone swipes, and a clean dark theme.**
Plain HTML, CSS and JavaScript. No libraries. No installs.

<br>

[![Play Now](https://img.shields.io/badge/▶_PLAY_NOW-2563eb?style=for-the-badge&logoColor=white)](https://YOUR-USERNAME.github.io/2048-better/)

<br>

![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

---

## ✨ Features

| | |
|---|---|
| ↩️ **Undo** | Made a bad move? Take it back (up to 50 moves). |
| 📱 **Swipe controls** | Works great on phones and tablets. |
| 🏆 **Best score saved** | Your high score stays between visits. |
| ♾️ **Keep going** | Hit 2048 and keep playing for a higher score. |
| 🌙 **Dark theme** | Easy on the eyes, with smooth tile animations. |
| ⚡ **Zero dependencies** | One HTML file, one CSS file, one JS file. |

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
git clone https://github.com/YOUR-USERNAME/2048-better.git
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

Ideas or bugs? [Open an issue](https://github.com/YOUR-USERNAME/2048-better/issues).

## 🙏 Credits

Inspired by [2048](https://github.com/gabrielecirulli/2048) by Gabriele Cirulli. All code in this repo is written from scratch.

## 📄 License

[MIT](LICENSE). Free to use, change, and share.
