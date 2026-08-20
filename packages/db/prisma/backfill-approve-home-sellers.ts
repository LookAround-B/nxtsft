/**
 * One-off, idempotent backfill for the "no admin approval for Home Sellers"
 * change (08-20). Approves every Home Seller account still sitting in the old
 * pending-approval queue, so nobody who registered before this change is
 * stuck waiting on a gate that no longer exists for new signups.
 *
 * Deliberately scoped to role: "home-seller" only — Agent / Partner accounts
 * still go through admin approval (RERA verification) and must NOT be
 * touched by this script.
 *
 * Safe to re-run: it only flips verified false -> true where role is
 * home-seller. Delete this file once run.
 *
 *   pnpm --filter @nxtsft/db exec tsx prisma/backfill-approve-home-sellers.ts
 */
import prisma from "../client";

async function main() {
  const res = await prisma.user.updateMany({
    where: { role: "home-seller", verified: false },
    data: { verified: true, verifiedAt: new Date() },
  });
  console.log(`✓ Auto-approved ${res.count} previously-pending Home Seller account(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
