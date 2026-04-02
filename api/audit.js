import { auditLog, logEvent } from '../lib/db.js';

export default function handler(req, res) {
  // 🔴 VULN A05: Internal audit log publicly accessible — no auth
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  console.log(`[AUDIT-ENDPOINT] Accessed by ip=${ip}`);
  logEvent('AUDIT_ACCESSED', { ip }, req);

  return res.status(200).json({
    warning: 'This endpoint is not authenticated',
    total:   auditLog.length,
    log:     auditLog,
  });
}