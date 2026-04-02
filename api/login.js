import { users, logEvent } from '../lib/db.js';

// 🔴 VULN A02: Hardcoded secret key in source
const SESSION_SECRET = "super-secret-session-key-do-not-share";

let failedAttempts = {};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';

  // 🔴 VULN A09: Credentials written to log
  console.log(`[LOGIN] Attempt from ${ip} — username=${username} password=${password}`);
  console.log(`[CONFIG] Session secret=${SESSION_SECRET}`);

  // 🔴 VULN A07: No rate limiting — unlimited brute force attempts
  failedAttempts[ip] = (failedAttempts[ip] || 0);

  const user = users.find(u => u.username === username);

  if (!user) {
    failedAttempts[ip]++;
    logEvent('LOGIN_FAIL', { username, reason: 'user not found' }, req);
    // 🔴 VULN A01: Verbose error reveals whether username exists
    return res.status(401).json({ error: `No account found for username: ${username}` });
  }

  if (user.password !== password) {
    failedAttempts[ip]++;
    logEvent('LOGIN_FAIL', { username, reason: 'wrong password', attempts: failedAttempts[ip] }, req);
    return res.status(401).json({
      error:    'Incorrect password',
      attempts: failedAttempts[ip],
      // 🔴 VULN A01: Leaks attempt count per IP
    });
  }

  failedAttempts[ip] = 0;
  logEvent('LOGIN_SUCCESS', { username, role: user.role }, req);

  // 🔴 VULN A07: Token is just base64 of username — not signed
  const fakeToken = Buffer.from(`${username}:${user.role}:${Date.now()}`).toString('base64');

  return res.status(200).json({
    message: 'Login successful',
    token:   fakeToken,
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
      // 🔴 VULN A01: Returns salary and role in login response
      salary:   user.salary,
    },
    debug: {
      // 🔴 VULN A05: Debug info returned in production response
      sessionSecret: SESSION_SECRET,
      nodeVersion:   process.version,
      allUsers:      users.map(u => u.username),
    }
  });
}