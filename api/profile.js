import { users, logEvent } from '../lib/db.js';

export default function handler(req, res) {
  // 🔴 VULN A01: IDOR — no auth check, any ID returns any profile
  const { id } = req.query;
  const ip = req.headers['x-forwarded-for'] || 'unknown';

  console.log(`[PROFILE] Request for id=${id} from ip=${ip}`);
  logEvent('PROFILE_ACCESS', { id, ip }, req);

  const user = users.find(u => u.id === parseInt(id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Returns everything including plaintext password
  return res.status(200).json(user);
}