import { z } from 'zod';

// Opaque to the server - the onboarding wizard's shape is frontend-owned and
// evolves there (see db/schema.ts's onboardingProfiles comment), so this
// only checks "is a plain object", not individual field shapes.
const saveOnboardingProfileSchema = z.record(z.any());

module.exports = { saveOnboardingProfileSchema };
