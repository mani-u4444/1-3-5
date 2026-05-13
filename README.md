# 🧠 SpacedMind

**Spaced repetition study planner.** Add concepts you learn each day, review them on Day 3 and Day 7, and track your mastery. Data lives in Google Sheets (free) and the app hosts on GitHub Pages (free).

## Quick Start

```bash
npm install
npm run dev          # local dev server
npm run build        # production build → dist/
```

## Deploy to GitHub Pages

1. Push to GitHub
2. Settings → Pages → Source: **GitHub Actions**
3. The included `.github/workflows/deploy.yml` auto-builds on every push

### Custom domain

Settings → Pages → Custom domain → add your domain, then add DNS records:

| Type  | Name  | Value               |
|-------|-------|---------------------|
| A     | @     | 185.199.108.153     |
| A     | @     | 185.199.109.153     |
| A     | @     | 185.199.110.153     |
| A     | @     | 185.199.111.153     |

Or for a subdomain: `CNAME` → `study` → `YOUR_USER.github.io`

Add a `public/CNAME` file with your domain so it persists across deploys.

## Google Sheets Backend

Click ⚙ Settings → Connect Google Sheets in the app. The setup wizard provides the Apps Script code and walks you through deployment.

**Sheet columns:** `id | title | notes | dateAdded | reviewedDay3 | reviewedDay7`

## Cost

| What | Cost |
|------|------|
| GitHub Pages | Free |
| Google Sheets | Free |
| SSL | Free |
| Domain | ~$10–15/yr |
