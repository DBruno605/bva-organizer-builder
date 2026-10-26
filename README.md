# Organizer Builder

Teachers paste an assignment's criteria and get a matched graphic organizer. Students fill it in on a web page (it saves on their device as they type), click **Turn in to Canvas**, and the tool:

1. signs them in with their own Canvas account (a pop-up window),
2. builds a **.docx** of their organizer and turns it in to the Canvas assignment for them,
3. emails them a copy of the same .docx,
4. signs the Canvas token back out.

Students can also click **Download my copy (.docx)** at any time.

## What's in the folder

| Path | What it is |
|---|---|
| `public/index.html` | The page: teacher setup (match, adjust, share) and the student organizer |
| `public/vendor/` | Word and PDF readers for **Upload the assignment** (served from your site, no outside CDN) |
| `public/organizers.js` | The 13 organizers and the criteria matcher. Edit here to add or change organizers |
| `netlify/functions/auth-start.mjs`, `auth-callback.mjs` | Canvas sign-in (OAuth2) |
| `netlify/functions/submit.mjs` | Builds the .docx, uploads and submits it, emails the copy, revokes the token |
| `netlify/functions/docx.mjs` | "Download my copy" |
| `netlify/functions/canvas-fetch.mjs` | Teacher's "Get it": reads an assignment or page description from Canvas |
| `netlify/lib/` | Shared code: .docx layout, Canvas calls, email, sealed sessions |
| `api/`, `vercel.json` | Vercel entry points (they call the same functions) |
| `test/run.mjs` | `npm test`: full flow against a fake Canvas, writes a sample .docx for every organizer to `test/out/` |

## One-time setup

### 1. Canvas developer key (BVA Canvas admin)
Admin > Developer Keys > **+ API Key**:
- **Redirect URI:** `https://YOUR-APP.vercel.app/api/auth-callback` on Vercel, or `https://YOUR-SITE.netlify.app/.netlify/functions/auth-callback` on Netlify
- Turn the key **On**. Copy its **Client ID** (the number) and **Client Secret**.
- If the admin turns on **Enforce scopes**, allow these and set `CANVAS_SCOPES` (space separated) to the same list:
  - `url:POST|/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id/files`
  - `url:POST|/api/v1/courses/:course_id/assignments/:assignment_id/submissions`
  - `url:GET|/api/v1/users/:user_id/profile`
  - `url:GET|/api/v1/courses/:course_id/assignments/:id` (teacher "Get it" from an assignment link)
  - `url:GET|/api/v1/courses/:course_id/pages/:url_or_id` (teacher "Get it" from a page link)

### 2. Email account for the copies
Any SMTP account works. With Google Workspace, use a no-reply account and an App Password (`smtp.gmail.com`, port 465). Check with the district before emailing students from a new account.

### 3a. Deploy on Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com, choose **Add New > Project**, import the repo, leave Framework Preset as **Other**, and click **Deploy**. `vercel.json` already sets the page folder and the server routes.
3. In the project's **Settings > Environment Variables**, add the variables in the table below, then go to **Deployments** and **Redeploy** so they take effect.
4. The developer key's Redirect URI is `https://YOUR-APP.vercel.app/api/auth-callback`.

The site opens at the **Domains** link on the project's page (for example `https://bva-organizer-builder.vercel.app`).

### 3b. Or deploy on Netlify
In Terminal, from this folder: `npm install`, then `npx netlify-cli deploy --prod` (first run asks you to log in and create a site). Drag-and-drop deploys do not run the server functions, so use the CLI or connect the folder from GitHub. Then in Netlify, Site configuration > Environment variables. Both hosts use these:

| Variable | Value |
|---|---|
| `CANVAS_BASE_URL` | `https://cciubva.instructure.com` (default) |
| `CANVAS_CLIENT_ID` | from step 1 |
| `CANVAS_CLIENT_SECRET` | from step 1 |
| `CANVAS_SCOPES` | only if scopes are enforced |
| `SESSION_SECRET` | any random string of 32+ characters |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | from step 2 |
| `MAIL_FROM` | e.g. `BVA Organizers <noreply@yourschool.org>` |

Leave the SMTP variables out and everything still works except the email copy.

## Using it for an assignment
1. Open the site and add the assignment one of three ways: upload a Word, PDF, or text file; paste a Canvas assignment or page link and click **Get it** (you sign in with Canvas, and an assignment link also fills in step 4); or type/paste the title and criteria. Click **Find organizers** and pick one. **Start over** clears everything for the next assignment.
2. Adjust labels, prompts, how many boxes, and the checklist.
3. In Canvas, set the assignment to **File Uploads** (allow .docx). Paste the assignment's link into step 4.
4. Copy the **Student link** into the assignment description (a link, or an iframe embed).

## Things to know
- Student work saves in the browser on that device. Switching Chromebooks starts a fresh copy.
- The student link holds the whole organizer, so if you change the organizer, share the new link.
- The submitted file is named with the student's Canvas name, so a typed name can't be faked.
- If a school browser blocks pop-ups, students see a message asking them to allow pop-ups for the site.
- Students' Canvas tokens are never readable by the page: they are encrypted server-side, used once, then revoked.
