import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ping } from './db.js';
import recordsRouter     from './routes/records.js';
import plansRouter       from './routes/plans.js';
import jigSetupRouter    from './routes/jigSetup.js';
import rosterRouter      from './routes/roster.js';
import calibrationRouter from './routes/calibration.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// Allow React dev server + same-origin production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // jig setup may include base64 images

// Health check — frontend polls this to confirm SQL backend is live
app.get('/health', async (_req, res) => {
  try {
    await ping();
    res.json({ ok: true, ts: Date.now() });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.use('/pm-records',   recordsRouter);
app.use('/pm-plans',     plansRouter);
app.use('/jig-setup',    jigSetupRouter);
app.use('/roster',       rosterRouter);
app.use('/calibration',  calibrationRouter);

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => {
  console.log(`PM JIG API  →  http://localhost:${PORT}`);
  console.log(`MySQL DB    →  ${process.env.DB_NAME || 'jig_pm'} @ ${process.env.DB_HOST || 'localhost'}`);
});
