# StudyMate — Student Study Dashboard

StudyMate is a small website made with HTML, CSS, and JavaScript. It works without a database and saves each student's notes, tasks, custom questions, quiz results, and completed focus sessions in the current browser using `localStorage`.

## What works

- **Study Notes:** add, search, edit, and delete notes.
- **Quizzes:** practice built-in Mathematics, Biology, English, Python, and General Science questions; get feedback and explanations; create your own multiple-choice questions.
- **Study Planner:** add tasks, set dates and minutes, mark tasks complete, filter tasks, and delete tasks.
- **Focus Timer:** use 25-minute focus and 5-minute break presets, or choose a custom time. Completed focus sessions are counted.
- **Motivation:** show a new positive study message.
- **Study Helper:** use the built-in offline study tips without an API key. To get open-ended answers from an AI model, configure the optional server below.

## Quick start (without real AI)

1. Unzip the project folder.
2. Open `index.html` in Chrome or Edge.
3. Use My Notes, Quizzes, Planner, Focus Timer, and Study Helper.

All these tools work in the browser. The offline Study Helper uses built-in responses rather than a live AI model. Data stays on that browser and device; it is not an account system and will not automatically sync to another device.

## Optional: enable real AI answers

The API key must stay on the server, not in browser JavaScript. The backend uses Node.js built-in modules, so no `npm install` is needed.

1. Install Node.js version 18 or newer from the official Node.js website.
2. Copy `.env.example` and name the copy `.env` in this folder.
3. Open `.env` in a text editor and add your API key after `OPENAI_API_KEY=`. Keep this file private and do not send it to anyone or upload it to GitHub.
4. Open a terminal in the `studymate-project` folder.
5. Run:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000` in your browser. The Study Helper will use the AI backend when the key is configured. If the server or AI is unavailable, it falls back to the built-in helper.

**Important:** Real AI requires an API key with API access enabled, an internet connection, and possibly paid API usage. Check the current API pricing first and ask a trusted adult before enabling any paid service. Do not share your API key. You do not need a key to use the other StudyMate tools.

## Useful files

- `index.html` — page structure
- `style.css` — design and responsive layout
- `scripts.js` — notes, quizzes, study planner, timer, motivation, and chat interface
- `server.js` — optional local server and secure AI API route
- `.env.example` — template for optional private settings

## Notes about storage and accounts

This is a local, single-browser demo. There is no user registration or password login, no cloud database, and no shared online accounts. Each browser profile has its own saved data. For a public site with real user accounts and private multi-user data, add a proper authentication system and server-side database before publishing.
