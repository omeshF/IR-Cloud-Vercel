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

  // 🔴 CRITICAL VULNERABILITY: Password is completely ignored!
  // This allows login with ANY password for any existing user
  console.log(`[LOGIN] 🔴 AUTH BYPASS: Password '${password}' is accepted for any user!`);

  // Find the user by username only (no password validation)
  const user = users.find(u => u.username === username);

  if (!user) {
    failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
    logEvent('LOGIN_FAIL', { username, reason: 'user not found' }, req);
    // 🔴 VULN A01: Verbose error reveals whether username exists
    return res.status(401).json({ error: `No account found for username: ${username}` });
  }

  // 🔴 VULNERABILITY: NO PASSWORD CHECK!
  // Any password (or no password) works for any valid username
  // The password parameter is completely ignored
  
  failedAttempts[ip] = 0;
  logEvent('LOGIN_SUCCESS', { 
    username, 
    role: user.role,
    // 🔴 Logs the fake password used to bypass auth
    password_used: password,
    auth_bypass: true 
  }, req);

  // 🔴 VULN A07: Token is just base64 of username:role:timestamp - not signed
  const fakeToken = Buffer.from(`${username}:${user.role}:${Date.now()}:auth_bypass`).toString('base64');

  return res.status(200).json({
    message: '✅ Login successful (AUTHENTICATION BYPASS - password not validated!)',
    warning: '🔴 This endpoint accepts ANY password for existing users',
    token: fakeToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      // 🔴 VULN A01: Returns salary and password in login response
      salary: user.salary,
      password: user.password, // Returns plaintext password too!
    },
    debug: {
      // 🔴 VULN A05: Debug info returned in production response
      sessionSecret: SESSION_SECRET,
      nodeVersion: process.version,
      allUsers: users.map(u => u.username),
      vuln_details: {
        type: "Authentication Bypass",
        description: "Password parameter is completely ignored",
        impact: "Anyone can login as any user without knowing their password"
      }
    }
  });
}