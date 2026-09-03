const { eq, and, isNull, desc } = require('drizzle-orm');
const { db } = require('../db/client');
const { passwordResets, users, authAccount } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const {
  asyncHandler, sendError, sendSuccess, hashPassword,
  generateOTP, hashOTP, verifyOTP, expiresAtInMinutes, signPasswordResetToken,
  verifyPasswordResetToken
} = require('../utilities/helpers/helper');
const { sendEmail } = require('../utilities/helpers/email');
const { HTTP_STATUS, RESET } = require('../utilities/constants');

// POST /api/auth/password/forgot
// Always 200 to prevent user enumeration.
// If user exists: create OTP + email it.
const requestReset = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Lookup user but do not leak existence
  const [user] = normalizedEmail
    ? await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
    : [null];


    if (user) {
        const otp = generateOTP(RESET.OTP_LENGTH);
        const otpHash = await hashOTP(otp);
        const expiresAt = expiresAtInMinutes(RESET.OTP_TTL_MINUTES);

        await db.insert(passwordResets).values(withTimestamps({
          id: newId(),
          userId: user.id,
          otpHash,
          expiresAt,
          usedAt: null,
          attempts: 0,
          requestedIp: req.ip,
          requestedUserAgent: req.get('user-agent') || null,
        }));

            // Send the code (SES under the hood). In dev w/o SES, logs to console.
        const subject = 'Your Adapted password reset code';
        const text = `Your reset code is ${otp}. It expires in ${RESET.OTP_TTL_MINUTES} minutes.`;
        const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
            <h2>Reset your Adapted password</h2>
            <p>Use this one-time code within <strong>${RESET.OTP_TTL_MINUTES} minutes</strong>:</p>
            <p style="font-size:24px;font-weight:700;letter-spacing:2px">${otp}</p>
            <p style="color:#666">If you didn’t request this, ignore this email.</p>
        </div>`;

        try {
            await sendEmail({ to: normalizedEmail, subject, text, html });
        } catch (error) {
            // Do not leak; just log server side
            console.error('[PasswordReset] sendEmail failed:', error.message);
        }
    }

    return sendSuccess(res, 'If the email is registered, an OTP has been sent.');
});

// POST /api/auth/password/verify-otp
// On success, returns a short-lived reset session token
const verifyResetOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedOTP = (otp || '').trim();

    // Phase B2: email format + 6-digit OTP shape already enforced by passwordVerifyOtpSchema.
    const genericErrorMsg = 'Invalid or expired OTP. Please request a new code.';

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (!user) return sendError(res, HTTP_STATUS.BAD_REQUEST, genericErrorMsg);

    // Latest unused request
    const now = new Date();
    const [resetRequest] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)))
      .orderBy(desc(passwordResets.expiresAt))
      .limit(1);

    if (!resetRequest || resetRequest.expiresAt <= now) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, genericErrorMsg);
    }

    if (resetRequest.attempts >= RESET.MAX_ATTEMPTS) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Too many incorrect attempts. Please request a new code.');
    }

    const ok = await verifyOTP(normalizedOTP, resetRequest.otpHash);
    if (!ok) {
        const nextAttempts = resetRequest.attempts + 1;
        await db.update(passwordResets).set(touch({ attempts: nextAttempts })).where(eq(passwordResets.id, resetRequest.id));
        const attemptsLeft = RESET.MAX_ATTEMPTS - nextAttempts;
        if (attemptsLeft > 0) {
            return sendError(res, HTTP_STATUS.BAD_REQUEST, `Invalid OTP. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
        } else {
            return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Too many incorrect attempts. Please request a new code.');
        }
    }

    // Success: issue purpose-scoped, short-lived reset token
    const resetToken = await signPasswordResetToken({ userId: user.id, requestId: resetRequest.id }, RESET.SESSION_TTL);
    return sendSuccess(res, 'OTP verified. You may now reset your password.', { resetToken });
});

// POST /api/auth/password/reset
// Accepts resetToken & newPassword; updates immediately; single-use
const resetPassword = asyncHandler(async (req, res) => {
    // Phase B2: resetToken presence + newPassword format already enforced by passwordResetSchema.
    const { resetToken, newPassword } = req.body || {};

    let payload;
    try {
        payload = await verifyPasswordResetToken(resetToken);
    } catch (error) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid or expired reset token.');
    }

    if (!payload || payload.purpose !== 'pwd_reset' || !payload.userId || !payload.requestId) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid reset token.');
    }

    const [resetRequest] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.id, payload.requestId), eq(passwordResets.userId, payload.userId)))
      .limit(1);
    if (!resetRequest) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid reset session.');
    }

    const now = new Date();
    if (resetRequest.usedAt || resetRequest.expiresAt <= now) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'This reset session has expired. Please request a new code.');
    }
    if (resetRequest.attempts >= RESET.MAX_ATTEMPTS) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Too many incorrect attempts. Please request a new code.');
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid Reset Session');
    }

    // Phase B4: the password better-auth actually checks at login lives on the
    // account (credential) table, not Users.password - update that, not the
    // legacy column (which nothing reads anymore since B4).
    const hashedPassword = await hashPassword(newPassword);
    await db.update(authAccount).set(touch({ password: hashedPassword }))
      .where(and(eq(authAccount.userId, user.id), eq(authAccount.providerId, 'credential')));
    await db.update(passwordResets).set(touch({ usedAt: now })).where(eq(passwordResets.id, resetRequest.id));
    return sendSuccess(res, 'Password updated successfully.');
});

module.exports = {
    requestReset,
    verifyResetOTP,
    resetPassword
};
