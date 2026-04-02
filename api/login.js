// 🔴 VULN #1: API key hardcoded in source (should use env vars properly)
const SECRET_API_KEY = "sk-vercel-lab-abc123secret";

// 🔴 VULN #2: Hardcoded credentials
const USERS = {
  "admin": "password123",
  "alice": "letmein",
  "bob":   "bob123"
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  // 🔴 VULN #3: Credentials logged to serverless logs
  console.log(`[LOGIN] Attempt - username: ${username} password: ${password}`);
  console.log(`[CONFIG] API Key loaded: ${SECRET_API_KEY}`);

  // 🔴 VULN #4: No rate limiting - unlimited attempts
  if (USERS[username] && USERS[username] === password) {
    console.log(`[LOGIN] SUCCESS for user: ${username}`);
    return res.status(200).json({
      success: true,
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.token",
      // 🔴 VULN #5: Returning internal info in response
      debug: {
        serverRegion: process.env.VERCEL_REGION || "unknown",
        nodeVersion:  process.version,
        allUsers:     Object.keys(USERS)
      }
    });
  }

  // 🔴 VULN #6: Verbose error reveals whether username exists
  if (USERS[username]) {
    console.log(`[LOGIN] FAIL - correct username, wrong password: ${username}`);
    return res.status(401).json({ error: "Wrong password for user: " + username });
  }

  console.log(`[LOGIN] FAIL - unknown username: ${username}`);
  return res.status(401).json({ error: "User not found: " + username });
}