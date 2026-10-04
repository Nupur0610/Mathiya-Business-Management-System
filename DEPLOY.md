# Deploying Mathiya (free): Atlas + Render + GitHub

## 1. Database (MongoDB Atlas, free M0)
1. Create an account at mongodb.com/atlas and a free **M0** cluster.
2. Database Access -> add a database user (username + password, no special characters is easiest).
3. Network Access -> add IP `0.0.0.0/0` (Render's IP changes).
4. Connect -> Drivers -> copy the connection string. Add the database name at the end:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mathiya_business`

### Move your existing local data (optional)
Needs MongoDB Database Tools installed. Run on your computer:
    mongodump --uri="mongodb://127.0.0.1:27017/mathiya_business" --out=./dump
    mongorestore --uri="YOUR_ATLAS_STRING" --nsInclude="mathiya_business.*" ./dump

## 2. GitHub
Create a **private** repo, then from this folder:
    git add .
    git commit -m "Prepare for deployment"
    git remote -v          (if a remote already exists, skip the next line)
    git remote add origin https://github.com/YOU/REPO.git
    git push -u origin main   (use your branch name if different)
`.env` files are ignored by git, so your secrets are not uploaded.

## 3. Render (Web Service, free)
New -> Web Service -> pick the repo. Settings:
- Root Directory: (leave empty)
- Build Command: `npm run build`
- Start Command: `npm start`
- Instance type: Free
Environment variables:
- `MONGO_URI` = your Atlas string
- `APP_PASSWORD` = the password you and your father will type
- `AUTH_SECRET` = any long random text (30+ characters)

When it finishes, open the `https://....onrender.com` link and sign in.

## 4. On phones
Open the link in Chrome (Android) or Safari (iPhone) -> menu -> **Add to Home Screen**.

## 5. Updating later
Change code -> `git push` -> Render redeploys automatically in a few minutes.

## Notes
- Free Render sleeps after ~15 min idle; first open can take 30-60 s.
  Optional: UptimeRobot (free) pinging `https://YOUR-APP.onrender.com/healthz` every 5 min keeps it awake.
- Free Atlas has no automatic backups: run `mongodump` against your Atlas string now and then.
- Local development: backend `npm run dev` in `backend/`, frontend `npm run dev` in `frontend/`
  (frontend needs `frontend/.env.local` with `VITE_API_URL=http://localhost:5000/api`).
