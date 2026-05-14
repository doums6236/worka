/**
 * One-shot script to insert the initial set of domains for Worka.
 *
 * Use ONLY for bootstrapping a fresh database. In production, domains are
 * managed by the admin via the dashboard. This script exists because we
 * need real data in staging before the admin web is built (sub-project #2).
 *
 * Usage (PowerShell from repo root):
 *   $env:DATABASE_URL = "<paste Postgres DATABASE_PUBLIC_URL from Railway>"
 *   pnpm --filter @worka/api exec tsx prisma/seed-domains.ts
 *   $env:DATABASE_URL = $null  # clean up
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOMAINS = [
  { nameFr: 'Tech & Informatique', nameEn: 'Tech', icon: '💻' },
  { nameFr: 'Banque & Finance', nameEn: 'Banking', icon: '🏦' },
  { nameFr: 'Santé', nameEn: 'Healthcare', icon: '🩺' },
  { nameFr: 'Marketing & Communication', nameEn: 'Marketing', icon: '📣' },
  { nameFr: 'Éducation', nameEn: 'Education', icon: '📚' },
  { nameFr: 'Commerce & Vente', nameEn: 'Commerce', icon: '🛒' },
  { nameFr: 'Logistique & Transport', nameEn: 'Logistics', icon: '🚚' },
  { nameFr: 'Bâtiment & BTP', nameEn: 'Construction', icon: '🏗️' },
  { nameFr: 'Énergie & Mines', nameEn: 'Energy', icon: '⚡' },
  { nameFr: 'Agriculture', nameEn: 'Agriculture', icon: '🌾' },
  { nameFr: 'Ressources Humaines', nameEn: 'HR', icon: '👥' },
  { nameFr: 'Hôtellerie & Restauration', nameEn: 'Hospitality', icon: '🍽️' },
];

async function main() {
  console.log(`Connecting to: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown host'}`);

  for (const d of DOMAINS) {
    const existing = await prisma.domain.findFirst({ where: { nameFr: d.nameFr } });
    if (existing) {
      console.log(`  skip "${d.nameFr}" (already exists)`);
      continue;
    }
    const created = await prisma.domain.create({ data: d });
    console.log(`  + ${d.icon} ${d.nameFr}  [${created.id}]`);
  }

  const total = await prisma.domain.count();
  console.log(`\n${total} domain(s) in DB.`);

  // Optional: promote a user to admin via PROMOTE_PHONE env var
  // Usage: $env:PROMOTE_PHONE="+224622123456"; pnpm seed:domains
  const promotePhone = process.env.PROMOTE_PHONE;
  if (promotePhone) {
    const user = await prisma.user.findUnique({ where: { phone: promotePhone } });
    if (!user) {
      console.log(`\n[promote] No user found with phone ${promotePhone}`);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'admin', status: 'active' } });
      console.log(`\n[promote] ${promotePhone} is now admin`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
