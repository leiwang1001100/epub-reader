# 📖 EPUB Reader + Library

> A lightweight, offline EPUB reader that runs entirely in your browser.  
> No server required — works directly with `file://`.

![Version](https://img.shields.io/badge/version-v1.7.6-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🌙 Dark Theme
- Automatically follows your **system preference** (macOS/browser dark mode setting)
- Toggle manually with the **◑ button** at the bottom of the sidebar
- Applies to: library, collections, sidebar, toolbar, cards, dropdowns, TOC
- Preference saved across sessions
- Does **not** affect the book reader (which has its own Paper/Sepia/Dark themes)

### 📚 Library
- Import multiple EPUB files at once
- Book cards with cover art, title, author, file size and date added
- Long titles truncated to 2 lines with full title on hover
- **Search** — filter books by title or author as you type
- **Sort** — by Newest, Oldest, Title A–Z, Title Z–A
- **Collection filter** — show all, uncategorised, or a specific collection
- **Pagination** — choose 20 / 50 / 100 books per page, preference saved across sessions
- **Collections** — organise books into named folders
- Assign/move books to collections via the `···` menu on each card (scrollable, keyboard navigable)
- Delete books with confirmation dialog

### 📁 Collections
- Create named collections (max 50 characters, no duplicates)
- Collections display cover art of the most recently added book
- Paginated collection grid (20 / 50 / 100 per page)
- Open a collection to view its books
- Remove books from a collection without deleting them
- Delete a collection — books return to the main library

### 📖 Reader
- Paginated and scrollable reading modes
- Adjustable font size (50% – 200%)
- Background themes: **Paper**, **Sepia**, **Dark**
- Table of Contents (TOC) sidebar — toggleable
- Reading progress bar with percentage
- Resumes at your last reading position automatically
- Full-text search within a book (press `Enter` to search)
- Font size and background theme persisted across sessions

### ⌨️ Keyboard Shortcuts

**Reader:**

| Key | Action |
|-----|--------|
| `←` / `PageUp` | Previous page |
| `→` / `PageDown` / `Space` | Next page |
| `T` | Toggle TOC sidebar |
| `B` | Cycle background theme |
| `+` / `Shift+=` | Increase font size |
| `-` / `_` | Decrease font size |

**`···` More Menu:**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate menu items |
| `Enter` / `Space` | Select focused item |
| `Escape` | Close menu |

---

## 🛠️ Setup

### Option A — Download ZIP (Easiest)
1. Go to 👉 [Releases](https://github.com/leiwang1001100/epub-reader/releases) and download the latest **`Source code (zip)`** or **`Source code (tar.gz)`**
2. Extract the archive to any folder on your computer
3. Open `index.html` in your browser — no server needed!
   - Double-click `index.html`, or open your browser and type:
   ```
   file:///your/path/to/epub-reader/index.html
   ```
   For example: `file:///Users/john/Downloads/epub-reader/index.html`
4. Click **Import EPUBs** to add books from your computer

### Option B — Clone with Git
```bash
git clone https://github.com/leiwang1001100/epub-reader.git
cd epub-reader
open index.html   # macOS
# or double-click index.html in your file explorer
```

> 💡 Books are stored locally in your browser's **IndexedDB** and persist across sessions — even after closing the browser.

> ⚠️ Keep all files (`index.html`, `styles.css`, `js/` folder) together in the same directory.

---

## 🗂️ Project Structure

```
epub_app/
├── index.html          # HTML structure only
├── styles.css          # All CSS styles
├── js/
│   ├── db.js           # IndexedDB helpers (openDB, idbAddBook, etc.)
│   ├── utils.js        # Shared utilities (escapeHtml, flashStatus, etc.)
│   ├── library.js      # Home library view & import logic
│   ├── collections.js  # Collections view, menus & detail view
│   ├── reader.js       # Book reader, TOC, search, progress
│   └── app.js          # App boot, element refs, event wiring
└── README.md
```

---

## 🧩 Notes

- Works fully offline — all data stored in your browser.
- Graphic novels in fixed-layout EPUB format may not render correctly (PDF format recommended for comics).
- To reset all data, clear site data in your browser DevTools → Application → IndexedDB.
- Best tested in modern browsers: **Chrome**, **Edge**, **Firefox**.
- Designed for **desktop/laptop use only** — mobile browsers are not supported.

### ⚠️ Known Limitations

| Limitation | Detail |
|---|---|
| **Library search/sort** | All books are loaded into memory for filtering and sorting. Works well for up to ~500 books. Beyond that, performance may degrade depending on device memory. |
| **Cover images** | Cover blobs are loaded into memory when rendering the library grid. Large libraries with high-resolution covers may increase memory usage. |
| **Fixed-layout EPUBs** | Graphic novels and comics in fixed-layout EPUB format are not supported. Use PDF format instead. |
| **File protocol** | The app runs from `file://` and does not use ES modules. All JS files are loaded via `<script>` tags in order. |
| **No sync** | Books and collections are stored locally in your browser only — no cloud sync or cross-device support. |
| **Delete from collection** | Books cannot be permanently deleted from within a collection view. To delete a book, return to **Home** (🏠) and use the ✖ button on the book card. The `···` menu inside a collection only removes the book from that collection — it does not delete it from your library. |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository on GitHub:  
   👉 https://github.com/leiwang1001100/epub-reader

2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/epub-reader.git
   ```

3. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```

4. **Make your changes** and test them locally by opening `index.html` in your browser.

5. **Commit** your changes with a clear message:
   ```bash
   git commit -m "feat: describe your change"
   ```

6. **Push** your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

7. **Open a Pull Request** against the `main` branch of the original repository.

### Commit message conventions

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring (no behaviour change) |
| `style:` | CSS/visual changes only |
| `docs:` | Documentation updates |

---

## 📜 License

MIT — free to use for personal or educational projects.
