const AppError = require('../errors/appError');

const uploadAttempts = new Map();
const windowMs = 60 * 1000;
const defaultLimit = 30;

function getRequestLimit() {
  const configuredLimit = Number(process.env.DMS_UPLOADS_PER_MINUTE);
  return Number.isSafeInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : defaultLimit;
}

function uploadRateLimit(req, res, next) {
  const now = Date.now();
  const clientAddress = req.socket.remoteAddress || 'unknown';

  for (const [address, attempt] of uploadAttempts) {
    if (now - attempt.startedAt >= windowMs) {
      uploadAttempts.delete(address);
    }
  }

  let attempt = uploadAttempts.get(clientAddress);
  if (!attempt) {
    if (uploadAttempts.size >= 10000) {
      uploadAttempts.delete(uploadAttempts.keys().next().value);
    }
    attempt = { startedAt: now, count: 0 };
    uploadAttempts.set(clientAddress, attempt);
  }

  if (attempt.count >= getRequestLimit()) {
    next(new AppError(429, 'UPLOAD_RATE_LIMITED', 'Muitas tentativas de upload. Tente novamente em um minuto.'));
    return;
  }

  attempt.count += 1;
  next();
}

module.exports = uploadRateLimit;