# Deadline Clock

**Every deadline in your own time zone, with a countdown.**

Live app: https://alenzacodes.github.io/deadline-clock/

## The problem

Contest, hackathon, scholarship and application deadlines are posted in whatever time zone the organiser uses: "Oct 30, 11:59 PM PT", "midnight ET", "AoE". It is easy to misread them and miss the cutoff, especially when the conversion pushes the deadline onto a different calendar day. For example, 11:59 PM PT on Oct 30 is 2:59 AM on Oct 31 in Toronto.

## Features

- Add a deadline with its name, date, time and the time zone it was posted in (PT, MT, CT, ET, AT, NT, UTC, GMT/BST, CET, IST, AEST, AoE and more), plus an optional link and note.
- Converts every deadline to your own time zone (auto-detected from the browser, changeable from a dropdown), handling daylight saving time.
- Shows the original posted time under the converted one.
- Flags a **date shift** when the local date differs from the posted date.
- Live countdown and colour badge: red under 24 hours, amber under 3 days, green otherwise, grey once passed.
- Sorted soonest first, with search and filters.
- Edit, delete, and export any deadline as an `.ics` calendar file.
- Saved in your browser's localStorage. No sign-in, no server, no external APIs and no AI calls at runtime.
- Starts empty. An "Add a sample deadline" button adds one clearly labelled example, so there is no fake data by default.

## How it was built

Built with Google AI Studio (vibe-coded) and Gemini: planned as a single build prompt (inputs, process, output), built in AI Studio, then refined over two fix rounds with a standing rule against fake pre-filled data. Exported and deployed as a static site to GitHub Pages.

Stack: React, TypeScript, Vite, Tailwind CSS, `Intl.DateTimeFormat` for time zone math.

## Run locally

Prerequisite: Node.js 20 or later.

```bash
git clone https://github.com/ALENZACODES/deadline-clock.git
cd deadline-clock
npm install
npm run dev      # http://localhost:3000/deadline-clock/
npm run build    # production build in dist/
npm run preview  # serve the build locally
```

No API key or `.env` file is needed.

---

© 2026 John K. All rights reserved.
