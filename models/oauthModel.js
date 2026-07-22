const db = require('../config/db')

function saveOAuthSession(state, codeVerifier, provider) {
  const statement = db.prepare(`
    INSERT INTO oauth_sessions (state, code_verifier, provider)
    VALUES (?, ?, ?)
  `)
  return statement.run(state, codeVerifier, provider)
}

function getOAuthSession(state) {
  const statement = db.prepare('SELECT code_verifier, provider FROM oauth_sessions WHERE state = ?')
  return statement.get(state)
}

function deleteOAuthSession(state) {
  const statement = db.prepare('DELETE FROM oauth_sessions WHERE state = ?')
  return statement.run(state)
}

function upsertUser(provider, profile) {
  const statement = db.prepare(`
    INSERT INTO oauth_users (provider, provider_id, email, name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(provider, provider_id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email
  `)
  return statement.run(provider, profile.providerId, profile.email, profile.name)
}

module.exports = {
  saveOAuthSession,
  getOAuthSession,
  deleteOAuthSession,
  upsertUser
}
