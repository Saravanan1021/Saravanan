const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not open database:', err);
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

initDb()
  .then(() => {
    console.log('Database initialized at', dbPath);
    db.close();
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    db.close();
    process.exit(1);
  });
