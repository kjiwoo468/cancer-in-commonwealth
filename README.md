# Cancer in the Commonwealth — Website Files

This folder contains a complete, ready-to-use website for the *Cancer in the
Commonwealth* curriculum. It's a free, self-paced, three-module course with
built-in activities, knowledge checks, and quizzes — adapted from the
University of Kentucky Markey Cancer Center's Appalachian cancer education
curriculum.

You don't need to know how to code to use this. This guide walks you through
everything, starting from "what even are these files."

---

## 1. What's in this folder

```
cancer-in-commonwealth/
├── index.html             ← The homepage
├── module1.html           ← Module 1: Cancer Basics & Health Disparities
├── module2.html           ← Module 2: Risk Factors & Modifiable Behaviors
├── module3.html           ← Module 3: Diagnosis & Treatment
├── certificate.html       ← Printable completion certificate
├── risk-calculator.html   ← Educational (non-diagnostic) cancer risk calculator
├── 404.html                ← Shown for any broken/missing link
├── assets/
│   ├── style.css            ← All the design/styling
│   ├── app.js                ← Navigation, progress tracking, quizzes, certificates, AskCommon widget
│   ├── quiz-data.js           ← The pre/post-test question banks (all 3 modules)
│   ├── risk-calc-data.js       ← Risk calculator question bank
│   └── og-image.png           ← Social-sharing preview image
├── api/
│   ├── ask.js                ← AskCommon's chat endpoint (Vercel serverless function)
│   └── knowledge-base.js      ← Course facts AskCommon grounds its answers in
├── ASKCOMMON-SETUP.md      ← How to turn on the AskCommon chat assistant (Vercel only)
├── robots.txt / sitemap.xml / vercel.json  ← Search-engine & hosting config
└── README.md               ← This file
```

Each `.html` file is a **page** of the website. The `assets` folder holds the
shared "behind the scenes" files that every page uses — this keeps the site
consistent and means you only have to update styling or scripts in one
place.

**Important:** Keep this folder structure exactly as-is. The pages link to
`assets/style.css` and `assets/app.js` using that exact path, so if you move
or rename the `assets` folder, the site will lose its styling and
interactivity.

---

## 2. See it on your own computer first (no setup required)

1. Find the folder you downloaded/unzipped — it should be called something
   like `cancer-in-commonwealth`.
2. Double-click `index.html`.
3. It will open in your web browser (Chrome, Edge, Firefox, Safari — any of
   them work), and you can click around exactly like a real website.

This is a great way to preview things and make sure everything looks right
before you put it online for students to use. Everything will work,
including quizzes and progress saving — the only thing that *won't* work
this way is sharing it with other people, since it's only on your computer.

---

## 3. Put it online so students can access it

You have a couple of free, beginner-friendly options. **Netlify is the
easiest** if you've never done this before — no account on GitHub required,
and no command line.

### Option A: Netlify Drop (easiest — drag and drop, 2 minutes)

1. Go to **https://app.netlify.com/drop** in your browser.
2. You may be asked to sign up for a free account (you can use Google,
   email, etc.) — this is just so your site stays online.
3. Drag your **entire `cancer-in-commonwealth` folder** from your computer's
   file browser into the big drop area on the Netlify page.
   - Make sure you drag the *folder*, not individual files, so the `assets`
     subfolder comes along with it.
4. Netlify will upload everything and give you a live web address, like
   `https://random-name-12345.netlify.app`. That's it — your site is live!
5. (Optional) In Netlify, you can click "Site settings" → "Change site name"
   to pick a friendlier address, like
   `https://cancer-in-the-commonwealth.netlify.app`.

To update the site later, just go back to your Netlify site's dashboard and
drag the updated folder in again — it will replace the old version.

### Option B: GitHub Pages (free, a little more setup, good for long-term projects)

This option is nice if you (or your school) might want other people to help
edit the site over time, since it keeps a history of changes.

1. Create a free account at **https://github.com** if you don't have one.
2. Click the **+** icon in the top right → **New repository**.
   - Name it something like `cancer-in-commonwealth`.
   - Set it to **Public**.
   - Click **Create repository**.
3. On the new repository page, click **"uploading an existing file"** (it's
   a link in the middle of the page).
4. Drag in **all the files and folders** from `cancer-in-commonwealth` (the
   `.html` files, the `assets` folder, and `README.md`).
   - GitHub will preserve the folder structure as long as you drag the
     `assets` folder in along with everything else.
5. Scroll down and click **Commit changes**.
6. Go to the repository's **Settings** tab → **Pages** (in the left
   sidebar).
7. Under "Branch," choose **main** and folder **/ (root)**, then click
   **Save**.
8. Wait a minute or two, then refresh the page. GitHub will show you a link
   like `https://yourusername.github.io/cancer-in-commonwealth/` — that's
   your live site.

### Option C: Vercel

The included `vercel.json` sets sensible security headers if you deploy
with [Vercel](https://vercel.com) — just import the repo/folder from your
Vercel dashboard and it will pick up the settings automatically.

---

## 4. How the site works (so you can explain it to students)

- **Self-paced sections:** Each module is broken into short sections.
  Students use the **Next →** and **← Back** buttons to move through them,
  in order — sections unlock one at a time, so they can always revisit what
  they've already read. There's no time limit.
- **Pre-test, then post-test:** Near the start of each module, students take
  a 10-question pre-test (no feedback — it's just a baseline). The same 10
  questions appear again near the end as a post-test, this time with
  instant feedback and explanations, plus a comparison ("You scored 4/10
  before this module and 8/10 after"). These are the official Lesson 1–3
  pre/post-tests from the *Cancer in the Commonwealth* curriculum.
- **Progress is saved automatically** — only in that student's own browser,
  on that device. It uses a browser feature called `localStorage`, which
  just means "remember this on this computer." Nothing is sent anywhere or
  shared with anyone else — the site has no backend or accounts.
- **Activities & quizzes give instant feedback.** When a student clicks an
  answer, they immediately see whether it's correct and why.
- **Certificates:** Once a student finishes a module's post-test, the
  completion banner links to `certificate.html`, where they can type their
  name and print (or save as a PDF) a certificate for that module.
  Finishing all three modules unlocks a full-course certificate.
- **Resetting progress:** On the homepage, there's a "Reset my progress"
  button. This is useful if students are sharing a school computer and the
  next student wants to start fresh.
- **Risk calculator:** `risk-calculator.html` walks students through
  lifestyle/history questions and gives a plain-language, non-diagnostic
  "below/about/above average" result — clearly labeled as educational only.
- **AskCommon chat assistant:** A floating "AskCommon" button (bottom-right
  of every page) lets students ask free-form cancer questions. This one
  needs a one-time setup step and only works if you're hosting on Vercel
  (Option C above) — see **`ASKCOMMON-SETUP.md`**. Until it's set up, the
  chat button still appears but tells students it isn't connected yet;
  nothing else on the site is affected either way.

---

## 5. Making simple edits (optional)

If you want to fix a typo or tweak some wording, you can edit the `.html`
files with **any plain text editor** — Notepad (Windows), TextEdit (Mac,
using "Format → Make Plain Text" first), or a free tool like
[Visual Studio Code](https://code.visualstudio.com/) (more
beginner-friendly for this kind of thing, with color-coding to help you see
the structure).

A few tips:
- Text you see on the website is usually inside `<p>...</p>`,
  `<li>...</li>`, or `<h2>...</h2>` tags. You can safely change the words
  *between* the tags without breaking anything — just be careful not to
  delete the `<...>` symbols themselves.
- The pre/post-test questions live in `assets/quiz-data.js`, in plain
  English — you can edit the `q`, `choices`, and `explanation` text there
  without touching any of the surrounding code.
- After editing, save the file and refresh it in your browser (double-click
  it again, or hit refresh if it's already open) to see your changes.
- If something looks broken after an edit, it's often because a `<` or `>`
  or a quotation mark got accidentally deleted. You can always re-download
  the original file if needed.

---

## 6. Credits

The educational content is adapted from the *Cancer in the Commonwealth*
curriculum, © University of Kentucky Markey Cancer Center, 2020–2025. For
more information about the original curriculum, contact
nathan.vanderford@uky.edu.

This website (the code, design, and interactive activities) was generated
to make that curriculum available as a self-paced online course.
