// 🔴 VULN #9: Internal log endpoint left exposed with no auth
const inMemoryLogs = [];

export function addLog(entry) {
  inMemoryLogs.push({ ts: new Date().toISOString(), ...entry });
}

export default function handler(req, res) {
  console.log(`[LOGS] Internal log endpoint accessed from: ${req.headers['x-forwarded-for']}`);
  // 🔴 Returns all internal logs to anyone who asks
  return res.status(200).json({
    warning: "This endpoint should not be public",
    logs: inMemoryLogs,
    env: {
      region:  process.env.VERCEL_REGION,
      node:    process.version,
    }
  });
}