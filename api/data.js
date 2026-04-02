// 🔴 VULN #7: IDOR - any user ID can be accessed with no auth check
const USER_DATA = {
  "1": { name: "Admin User",  email: "admin@company.com",  role: "admin",  salary: 95000 },
  "2": { name: "Alice Smith", email: "alice@company.com",  role: "staff",  salary: 52000 },
  "3": { name: "Bob Jones",   email: "bob@company.com",    role: "staff",  salary: 48000 },
  "4": { name: "Charlie DB",  email: "charlie@company.com",role: "dba",    creditCard: "4111-1111-1111-1111" }
};

export default function handler(req, res) {
  const { id } = req.query;

  // 🔴 VULN #8: No authentication check whatsoever
  console.log(`[DATA] Request for user ID: ${id} from IP: ${req.headers['x-forwarded-for']}`);

  if (USER_DATA[id]) {
    console.log(`[DATA] Returning data for ID ${id}: ${JSON.stringify(USER_DATA[id])}`);
    return res.status(200).json(USER_DATA[id]);
  }

  return res.status(404).json({ error: "User not found" });
}