import { users, logEvent } from '../lib/db.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password, email } = req.body;

  // 🔴 VULN A03: No input validation or sanitisation
  // 🔴 VULN A02: Password stored in plaintext, never hashed
  // 🔴 VULN A09: Full credentials written to log
  console.log(`[REGISTER] New user: username=${username} password=${password} email=${email}`);

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (users.find(u => u.username === username)) {
    // 🔴 VULN A01: Username enumeration — confirms account exists
    return res.status(409).json({ error: `Username '${username}' is already taken` });
  }

  const newUser = {
    id:       users.length + 1,
    username,
    password, // plaintext
    email,
    role:     'staff',  // Regular users get 'staff' role (not admin)
    salary:   35000,
  };

  users.push(newUser);
  logEvent('REGISTER', { username, password, email }, req);

  // 🔴 VULN A01: Returns full user object including password
  return res.status(201).json({
    message: 'Account created successfully! You can now login.',
    user:    newUser,
  });
}