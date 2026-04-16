# 📖 EPUB Reader + Library (Offline, Browser-Based)

A lightweight, offline EPUB reader that runs entirely in your browser.  
Books are imported, stored locally with **IndexedDB**, and available in your library even after reloads.  
No server required — works with `file://`.

---

## 🚀 Features

- **Import EPUBs** from your computer
- **Library view** with covers, metadata, delete & continue reading
- **Reader view** with:
  - Table of Contents (TOC) sidebar (toggleable)
  - Pagination or scrolling mode
  - Adjustable font size
  - Background themes: Paper, Sepia, Dark
  - Smooth navigation with on-screen or keyboard controls
- **Local persistence** using IndexedDB
- **No backend** — works offline, directly in browser

---

## 🛠️ Setup

1. Clone or download the project.
2. Open `index.html` directly in your browser (`file://` works).
3. Import EPUBs via the **Import EPUBs** button.
4. Books are saved in your browser storage.

---

## 📚 Usage

- **Library view**
  - Import EPUBs with the **Import EPUBs** button.
  - Click a book card to start reading.
  - Continue reading resumes at your last position.
  - Delete removes a book from storage.

- **Reader view**
  - **TOC sidebar** for quick navigation.
  - **Controls bar** (bottom):
    - ⬅️ Prev / ➡️ Next page
    - Hide/Show TOC
    - Font size (A− / A+)
    - Background cycling (Paper → Sepia → Dark)
    - Scroll / Paginated toggle

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← / PageUp | Previous page |
| → / PageDown / Space | Next page |
| **T** | Toggle TOC sidebar |
| **B** | Cycle background (Paper → Sepia → Dark) |
| **+ / Shift+=** | Increase font size |
| **- / _** | Decrease font size |

---

## 🧩 Notes

- Works offline — all data stored in your browser.
- To reset, clear site data in your browser dev tools.
- Best tested in modern browsers (Chrome, Edge, Firefox).

---

## 📜 License

MIT — use freely for personal or educational projects.
