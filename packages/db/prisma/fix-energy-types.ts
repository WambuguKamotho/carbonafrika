/**
 * One-time fix: set projectType=CLEAN_ENERGY and energyType on all energy seed projects.
 * Safe to re-run — uses updateMany with onChainId targeting.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENERGY_PROJECTS = [
  { onChainId: 'CHAIN-E001', energyType: 'SOLAR_PV' },
  { onChainId: 'CHAIN-E002', energyType: 'BIOGAS' },
  { onChainId: 'CHAIN-E003', energyType: 'BIOGAS' },
  { onChainId: 'CHAIN-E004', energyType: 'COOKSTOVES' },
  { onChainId: 'CHAIN-E005', energyType: 'COOKSTOVES' },
  { onChainId: 'CHAIN-E006', energyType: 'MICRO_HYDRO' },
  { onChainId: 'CHAIN-E007', energyType: 'BIOCHARCOAL' },
  { onChainId: 'CHAIN-E008', energyType: 'WIND' },
  { onChainId: 'CHAIN-E009', energyType: 'SOLAR_PV' },
] as const;

async function main() {
  console.log('🔧  Fixing energy project types…');

  for (const { onChainId, energyType } of ENERGY_PROJECTS) {
    const result = await prisma.project.updateMany({
      where: { onChainId },
      data: { projectType: 'CLEAN_ENERGY', energyType, landType: null },
    });
    console.log(`  ${onChainId} → CLEAN_ENERGY / ${energyType}  (${result.count} row updated)`);
  }

  // Verify
  const energyProjects = await prisma.project.findMany({
    where: { onChainId: { in: ENERGY_PROJECTS.map(p => p.onChainId) } },
    select: { onChainId: true, title: true, projectType: true, energyType: true },
  });

  console.log('\n✅  Current state:');
  for (const p of energyProjects) {
    const ok = p.projectType === 'CLEAN_ENERGY' && p.energyType !== null;
    console.log(`  ${ok ? '✓' : '✗'} ${p.onChainId}  ${p.projectType} / ${p.energyType}  — ${p.title}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
