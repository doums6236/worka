/**
 * One-shot script to create a test recruiter + company + a few published jobs
 * so the mobile swipe feed has content to display in staging.
 *
 * Run AFTER seed-domains.ts. Idempotent — safe to re-run.
 *
 * Usage (PowerShell from D:\dums\worka):
 *   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL from Railway>"
 *   pnpm --filter @worka/api exec tsx prisma/seed-test-jobs.ts
 *   $env:DATABASE_URL = $null
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_RECRUITER_PHONE = '+224999000001';
const TEST_COMPANY_NAME = 'Worka Demo SARL';

async function main() {
  console.log(`Connecting to: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown host'}`);

  // 1. Test recruiter user
  let recruiter = await prisma.user.findUnique({ where: { phone: TEST_RECRUITER_PHONE } });
  if (!recruiter) {
    recruiter = await prisma.user.create({
      data: {
        phone: TEST_RECRUITER_PHONE,
        role: 'recruiter',
        status: 'active',
        countryCode: 'GN',
      },
    });
    console.log(`  + recruiter user ${recruiter.id}`);
  } else {
    console.log(`  skip recruiter user (exists)`);
  }

  // 2. Test company
  let company = await prisma.company.findFirst({ where: { name: TEST_COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: TEST_COMPANY_NAME,
        sector: 'Technologie',
        country: 'GN',
        city: 'Conakry',
        description: 'Compagnie de démonstration pour le staging.',
        plan: 'free',
      },
    });
    console.log(`  + company ${company.id}`);
  } else {
    console.log(`  skip company (exists)`);
  }

  // 3. Recruiter profile linking user + company
  const rp = await prisma.recruiterProfile.findUnique({ where: { userId: recruiter.id } });
  if (!rp) {
    await prisma.recruiterProfile.create({
      data: {
        userId: recruiter.id,
        companyId: company.id,
        roleInCompany: 'CEO',
        verifiedAt: new Date(),
      },
    });
    console.log(`  + recruiterProfile`);
  }

  // 4. Get a few domains to assign
  const tech = await prisma.domain.findFirst({ where: { nameFr: 'Tech & Informatique' } });
  const finance = await prisma.domain.findFirst({ where: { nameFr: 'Banque & Finance' } });
  const marketing = await prisma.domain.findFirst({ where: { nameFr: 'Marketing & Communication' } });
  const sante = await prisma.domain.findFirst({ where: { nameFr: 'Santé' } });
  const commerce = await prisma.domain.findFirst({ where: { nameFr: 'Commerce & Vente' } });

  if (!tech || !finance || !marketing || !sante || !commerce) {
    throw new Error('Run seed-domains.ts first — required domains missing.');
  }

  // 5. 5 test jobs
  const jobs = [
    {
      title: 'Développeur Full Stack Node.js',
      description:
        'Rejoins notre équipe technique pour construire des applications web et mobiles à grande échelle. Stack moderne (Node.js, React, PostgreSQL). Belle équipe, projets ambitieux.',
      domainId: tech.id,
      salaryMin: 8_000_000,
      salaryMax: 14_000_000,
      type: 'cdi' as const,
    },
    {
      title: 'Chef de Projet Digital',
      description:
        "Pilote la transformation digitale de nos partenaires en Guinée. Méthodes Agile/Scrum. 3+ ans d'expérience requis.",
      domainId: tech.id,
      salaryMin: 6_000_000,
      salaryMax: 10_000_000,
      type: 'cdi' as const,
    },
    {
      title: 'Comptable SYSCOHADA',
      description:
        'Gère la comptabilité de nos clients selon les normes SYSCOHADA. Maîtrise de Sage indispensable. Cabinet en pleine croissance.',
      domainId: finance.id,
      salaryMin: 5_000_000,
      salaryMax: 8_000_000,
      type: 'cdi' as const,
    },
    {
      title: 'Responsable Marketing',
      description:
        'Définis et exécute la stratégie marketing de Worka Demo. Spécialiste social media, branding, et campagnes digitales.',
      domainId: marketing.id,
      salaryMin: 4_500_000,
      salaryMax: 7_500_000,
      type: 'cdd' as const,
    },
    {
      title: 'Infirmier·ère diplômé·e',
      description:
        'Notre clinique partenaire recrute des infirmier·ères pour son équipe de jour et de nuit. 2+ ans d\'expérience hospitalière.',
      domainId: sante.id,
      salaryMin: 3_500_000,
      salaryMax: 5_500_000,
      type: 'cdi' as const,
    },
    {
      title: 'Chargé·e de Clientèle Boutique',
      description:
        'Accueille et conseille les clients de notre boutique de mode à Conakry. Bonne présentation et sens du service indispensables.',
      domainId: commerce.id,
      salaryMin: 2_500_000,
      salaryMax: 4_000_000,
      type: 'cdi' as const,
    },
  ];

  for (const j of jobs) {
    const existing = await prisma.job.findFirst({
      where: { title: j.title, companyId: company.id },
    });
    if (existing) {
      console.log(`  skip "${j.title}" (exists)`);
      continue;
    }
    await prisma.job.create({
      data: {
        ...j,
        companyId: company.id,
        postedByUserId: recruiter.id,
        currency: 'GNF',
        country: 'GN',
        location: 'Conakry',
        status: 'published',
        publishedAt: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  + "${j.title}"`);
  }

  const total = await prisma.job.count({ where: { status: 'published' } });
  console.log(`\n${total} published job(s) in DB.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
