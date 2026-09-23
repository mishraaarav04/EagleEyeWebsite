# The Eagle Eye — dorm newspaper website

Next.js + TypeScript. Everything on the site comes from files in the `content/` folder, so to update the site you add, swap, or move files. You don't need to touch any code.

```
content/
  articles/
    current/   ← .docx files shown on the front page ("Current Articles")
    past/      ← .docx files shown under "Past Articles"
  games/
    connections.txt
    strands.txt
```

## Running it

You need [Node.js](https://nodejs.org) version 20 or newer.

```bash
npm install        # first time only
npm run dev        # work on it locally at http://localhost:3000
```

To run it for real: `npm run build` and then `npm start`. When the site runs this way on a computer or server, any file you drop into `content/` shows up the next time someone refreshes the page. If you host it on Vercel or Netlify instead, push or redeploy after you change files.

## Articles (Word .docx)

| Part of the doc | What it becomes |
|---|---|
| **Line 1** | Headline |
| **Line 2** | Byline and info, split by `\|`. Example: `By Jane Doe \| September 22, 2026 \| Opinion` |
| Everything after | The story. Bold, italics, headings, lists, quotes, tables, and pictures all carry over. |

- **Author:** the first piece of line 2 (a leading "By" is optional).
- **Date:** any piece of line 2 that looks like a date. It's used to sort articles, newest first.
- **Category:** the last piece of line 2 that isn't a date. It shows as the small label above the headline. If you leave it out, the space stays blank.
- **Pictures:** paste them anywhere in the Word doc. The **first picture** is used as the thumbnail on the front page.

### Box size from the file name

The file name must **include** `large`, `medium`, or `small`:

- `dining-hall-review-large.docx` → big lead box (4 columns wide, excerpt included)
- `floor-olympics-medium.docx` → regular box with a picture on top (the default if no size word is found)
- `laundry-tips-small.docx` → compact box with a thumbnail on the side

### Order

Newest date first. To pin a story, start its file name with a number (`01-welcome-back-large.docx`). Numbered files come first, lowest number first.

### Archiving

Move a file from `articles/current/` to `articles/past/`. Its link stays the same.

## Games

Open the `.txt` files. Each one has instructions at the top in lines starting with `#`.

**connections.txt:** 4 lines, one group per line, easiest group (yellow) first and hardest (purple) last:
```
Things in a dorm room: BED, DESK, LAMP, CLOSET
```

**strands.txt:** a theme, a spangram, and the theme words. The site builds the 8×6 letter grid for you. The letters of all the words together must add up to **48**, and the page tells you if they don't. You can also type your own grid under `grid:` if you'd like.

If a puzzle file has a mistake, the game page shows a message explaining what's wrong. The rest of the site keeps working.

## Changing the look

- Site name and tagline: `src/lib/site.ts`
- Colors, fonts, and layout: `src/app/globals.css`
