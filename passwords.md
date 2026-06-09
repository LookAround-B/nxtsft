# NxtSft — Demo Credentials

> **DEMO ONLY.** These accounts are seeded by `pnpm --filter @nxtsft/db db:seed`.
> Never use these credentials in production.

---

## All demo accounts share one password

```
demo1234
```

---

## Staff Accounts → login at `/admin-login`

| Name | Email | Role | Portal | City |
|---|---|---|---|---|
| Aarav Kapoor | `sa@nxtsft.com` | Super Admin | `/sa-portal` | Mumbai |
| Meera Iyer | `admin@nxtsft.com` | Admin | `/admin-portal` | Bengaluru |
| Rahul Verma | `supervisor@nxtsft.com` | Supervisor | `/supervisor-portal` | Delhi |
| Priya Sharma | `priya@nxtsft.com` | Sales | `/sales-portal` | Pune |
| Kiran Nair | `support@nxtsft.com` | Support Admin | `/support-portal` | Chennai |

## Consumer Accounts → login at `/login`

| Name | Email | Role | Credits | City |
|---|---|---|---|---|
| Rohan Mehta | `rohan@example.com` | Buyer (user) | 3 | Mumbai |
| Ananya Gupta | `ananya@example.com` | Customer | 3 | Delhi |

---

## Phone numbers (for DB reference)

| Email | Phone |
|---|---|
| `sa@nxtsft.com` | 9000000001 |
| `admin@nxtsft.com` | 9000000002 |
| `supervisor@nxtsft.com` | 9000000003 |
| `priya@nxtsft.com` | 9000000004 |
| `support@nxtsft.com` | 9000000005 |
| `rohan@example.com` | 9100000001 |
| `ananya@example.com` | 9100000002 |

---

## Re-seed anytime

```bash
pnpm --filter @nxtsft/db db:seed
```

Seed uses `upsert` — safe to run multiple times without duplicating rows.
