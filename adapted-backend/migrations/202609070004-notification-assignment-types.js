// Phase B18: two more notification events - being assigned an assessment,
// and a pending assignment's due date approaching. Purely additive (new
// enum values only); existing "org_member_joined" rows/behavior untouched.
const SQL = `
ALTER TYPE "enum_Notifications_type" ADD VALUE 'assessment_assigned';
ALTER TYPE "enum_Notifications_type" ADD VALUE 'assignment_due_soon';
`;

const up = async ({ client }) => {
  await client.query(SQL);
};

const down = async () => {
  // Postgres has no DROP VALUE for enums - a rollback here would require
  // recreating the type, which risks any rows already using these values.
  // Left as a no-op, same as any other purely-additive enum migration.
};

module.exports = { up, down };
