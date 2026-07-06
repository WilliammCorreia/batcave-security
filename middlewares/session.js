const { activeSessions } = require('./sessionStore')

function parseCookies(header = '') {
  const cookies = {}

  const parts = header.split(';')

  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex === -1) continue

    const name = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()

    cookies[name] = value
  }

  return cookies
}

// Lit le cookie sessionId et attache l'utilisateur correspondant à la requête
function loadSession(req, res, next) {
  const cookies = parseCookies(req.headers.cookie)
  const sessionId = cookies.sessionId

  req.sessionId = sessionId
  req.user = sessionId ? activeSessions.get(sessionId) : undefined

  next()
}

module.exports = { loadSession }
