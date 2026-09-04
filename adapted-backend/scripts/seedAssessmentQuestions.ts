// Phase B8: one-off seed for AssessmentQuestions, sourced from the frontend's
// existing question bank (pathwise-app-v5/src/features/assessment/
// questionBank.json - 100 questions x 4 personas, previously bundled straight
// into the client and never touched by a server). Idempotent: skips any
// persona that already has rows, rather than upserting - the ids in this
// table become the ids AssessmentSessions.questionIds points at, so re-
// seeding with fresh ids would orphan real sessions once any exist.
require('dotenv').config({ path: '.env' });
const path = require('path');
const { eq } = require('drizzle-orm');
const { db, pool: dbPool } = require('../db/client');
const { assessmentQuestions } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');

const BANK_PATH = path.join(__dirname, '../../pathwise-app-v5/src/features/assessment/questionBank.json');

const run = async () => {
  const bank = require(BANK_PATH);
  let inserted = 0;
  let skipped = 0;

  for (const personaId of Object.keys(bank)) {
    const [existing] = await db
      .select({ id: assessmentQuestions.id })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.personaId, personaId))
      .limit(1);

    if (existing) {
      skipped += bank[personaId].length;
      console.log(`[${personaId}] already seeded, skipping ${bank[personaId].length} questions`);
      continue;
    }

    const rows = bank[personaId].map((q: any) => withTimestamps({
      id: newId(),
      personaId,
      domain: q.domain,
      bloom: q.bloom || null,
      questionText: q.q,
      options: q.opts,
      correctIndex: q.correct,
      difficulty: q.difficulty ?? 0,
      explanation: q.explanation || null,
    }));

    await db.insert(assessmentQuestions).values(rows);
    inserted += rows.length;
    console.log(`[${personaId}] inserted ${rows.length} questions`);
  }

  console.log(`Done. Inserted ${inserted}, skipped ${skipped}.`);
  await dbPool.end();
};

run().catch((error: Error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
