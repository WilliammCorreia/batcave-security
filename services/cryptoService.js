const crypto = require('crypto')

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest()
    .toString('base64url')
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState: generateCodeVerifier
}
