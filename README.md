# BrickVault

Track dismantled LEGO sets, build a parts inventory, and check whether you can build any set from the parts you already own.

## Stack

| Layer | Tech | Host |
|---|---|---|
| Frontend | React + Vite | Vercel |
| Backend | Express + Node.js | Railway |
| Database | MongoDB | MongoDB Atlas |
| Catalog data | Rebrickable API | — |
| Buy links (optional) | BrickOwl API | — |

## Project structure

```
brickvault/
├── client/          React frontend
├── server/          Express API
├── package.json     Root scripts (run both apps)
└── README.md
```

## Local setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MongoDB URI and Rebrickable API key.

Get a free Rebrickable API key: https://rebrickable.com/api/

### 3. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Environment variables (server)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret for auth tokens |
| `REBRICKABLE_API_KEY` | Rebrickable catalog API key |
| `BRICKOWL_API_KEY` | Optional — for buy links |
| `CLIENT_URL` | Frontend URL (CORS), e.g. `http://localhost:5173` |
| `PORT` | Server port (default `3001`) |

## Deployment

### MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user and allow network access (`0.0.0.0/0` for Railway)
3. Copy the connection string into `MONGODB_URI`

### Railway (backend)

1. Connect your GitHub repo
2. Set root directory to `server`
3. Add environment variables from `server/.env.example`
4. Deploy

### Vercel (frontend)

1. Connect your GitHub repo
2. Set root directory to `client`
3. Add `VITE_API_URL` = your Railway backend URL
4. Deploy

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/sets/lookup/:setNum` | Resolve set number |
| POST | `/api/sets/owned` | Add dismantled set to inventory |
| GET | `/api/sets/owned` | List owned sets |
| DELETE | `/api/sets/owned/:id` | Remove owned set |
| GET | `/api/inventory` | Aggregated parts inventory |
| GET | `/api/build/:setNum` | Check build feasibility |

## License

MIT
