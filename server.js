const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const USE_TWILIO = String(process.env.USE_TWILIO).toLowerCase() === 'true';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE;
let twilioClient = null;

if (USE_TWILIO) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
    console.warn('TWILIO is enabled but missing credentials in .env. Falling back to console logging OTPs.');
  } else {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const dbPath = path.join(DATA_DIR, 'data.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database', err);
    process.exit(1);
  }
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await runAsync(`CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    skills TEXT,
    bio TEXT,
    city TEXT,
    userType TEXT,
    createdAt TEXT
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT,
    company TEXT,
    cat TEXT,
    city TEXT,
    dist REAL,
    lat REAL,
    lng REAL,
    salary REAL,
    period TEXT,
    hours TEXT,
    desc TEXT,
    contact TEXT,
    openings INTEGER,
    badge TEXT,
    status TEXT,
    postedAt TEXT,
    postedByPhone TEXT,
    applicants INTEGER DEFAULT 0
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS otp_codes (
    phone TEXT PRIMARY KEY,
    code TEXT,
    expiresAt INTEGER,
    used INTEGER DEFAULT 0
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jobId TEXT,
    phone TEXT,
    status TEXT,
    date TEXT,
    note TEXT,
    UNIQUE(jobId, phone)
  )`);
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+91' + digits.slice(1);
  if (digits.length >= 10 && String(phone).trim().startsWith('+')) return '+' + digits;
  return '+' + digits;
}

async function ensureColumn(table, column, definition) {
  const cols = await allAsync(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrateSchema() {
  await ensureColumn('jobs', 'lat', 'REAL');
  await ensureColumn('jobs', 'lng', 'REAL');
}

async function sendSmsMessage(phone, text) {
  if (twilioClient) {
    await twilioClient.messages.create({ from: TWILIO_FROM_PHONE, to: phone, body: text });
    return;
  }
  console.log('OTP SMS:', phone, text);
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/otp/request', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Invalid phone number' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await runAsync(`INSERT INTO otp_codes (phone, code, expiresAt, used) VALUES (?, ?, ?, 0)
      ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expiresAt = excluded.expiresAt, used = 0`, [phone, code, expiresAt]);

    await sendSmsMessage(phone, `Your Thozhil OTP code is ${code}. It expires in 5 minutes.`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create OTP' });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!phone || !/^[0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Invalid phone or code' });

    const row = await getAsync('SELECT * FROM otp_codes WHERE phone = ?', [phone]);
    if (!row || row.used || row.code !== code || row.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await runAsync('UPDATE otp_codes SET used = 1 WHERE phone = ?', [phone]);

    const user = await getAsync('SELECT * FROM users WHERE phone = ?', [phone]);
    if (user) {
      return res.json({ success: true, profile: user });
    }

    const newUser = {
      phone,
      name: 'Mobile User',
      email: '',
      skills: '',
      bio: '',
      city: 'Madurai',
      userType: 'seeker',
      createdAt: new Date().toISOString()
    };
    await runAsync(`INSERT INTO users (phone, name, email, skills, bio, city, userType, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [newUser.phone, newUser.name, newUser.email, newUser.skills, newUser.bio, newUser.city, newUser.userType, newUser.createdAt]);
    res.json({ success: true, profile: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profile = req.body || {};
    const phone = normalizePhone(profile.phone);
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    const user = {
      phone,
      name: String(profile.name || '').trim() || 'Mobile User',
      email: String(profile.email || '').trim(),
      skills: String(profile.skills || '').trim(),
      bio: String(profile.bio || '').trim(),
      city: String(profile.city || 'Madurai').trim(),
      userType: ['seeker', 'employer', 'both'].includes(profile.userType) ? profile.userType : 'seeker'
    };

    await runAsync(`INSERT INTO users (phone, name, email, skills, bio, city, userType, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET name = excluded.name, email = excluded.email,
      skills = excluded.skills, bio = excluded.bio, city = excluded.city, userType = excluded.userType`, [
      user.phone, user.name, user.email, user.skills, user.bio, user.city, user.userType, new Date().toISOString()
    ]);

    res.json({ success: true, profile: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save profile' });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    const user = await getAsync('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await allAsync('SELECT * FROM jobs ORDER BY postedAt DESC');
    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load jobs' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const job = req.body || {};
    const id = job.id || 'j' + Date.now();
    await runAsync(`INSERT INTO jobs (id, title, company, cat, city, dist, lat, lng, salary, period, hours, desc, contact, openings, badge, status, postedAt, postedByPhone, applicants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id,
      String(job.title || '').trim(),
      String(job.company || '').trim(),
      String(job.cat || 'other'),
      String(job.city || 'Madurai').trim(),
      Number(job.dist) || 0,
      job.lat == null ? null : Number(job.lat),
      job.lng == null ? null : Number(job.lng),
      Number(job.salary) || 0,
      String(job.period || '/month'),
      String(job.hours || '').trim(),
      String(job.desc || '').trim(),
      String(job.contact || '').trim(),
      Number(job.openings) || 1,
      String(job.badge || 'new'),
      String(job.status || 'active'),
      String(job.postedAt || new Date().toISOString()),
      String(job.postedByPhone || ''),
      Number(job.applicants) || 0
    ]);
    const created = await getAsync('SELECT * FROM jobs WHERE id = ?', [id]);
    res.json({ success: true, job: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save job' });
  }
});

app.post('/api/apply', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const jobId = String(req.body.jobId || '').trim();
    const note = String(req.body.note || '').trim();
    if (!phone || !jobId) return res.status(400).json({ error: 'Phone and jobId are required' });

    await runAsync(`INSERT INTO applications (jobId, phone, status, date, note)
      VALUES (?, ?, ?, ?, ?)`, [jobId, phone, 'review', new Date().toISOString(), note]);
    await runAsync('UPDATE jobs SET applicants = applicants + 1 WHERE id = ?', [jobId]);
    const job = await getAsync('SELECT * FROM jobs WHERE id = ?', [jobId]);
    res.json({ success: true, job });
  } catch (err) {
    if (err && err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Already applied' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not apply to job' });
  }
});

initDb().then(async () => {
  await migrateSchema();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('Backend ready. Use /api/otp/request and /api/otp/verify for mobile OTP login.');
  });
}).catch((err) => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});
