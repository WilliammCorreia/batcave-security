const express = require('express')
const router = express.Router()
const oauthController = require('../controllers/oauthController')

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

router.get('/login/:provider', oauthController.redirectToProvider)

router.get('/callback/:provider', oauthController.handleCallback)

router.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/')
  }

  res.send(`
    <h1>Bienvenue sur le tableau de bord</h1>
    <p>Bonjour ${escapeHtml(req.session.userName)}. Votre session est active et sécurisée.</p>
    <p>Connecté via : <strong>${escapeHtml(req.session.provider)}</strong></p>
    <a href="/api/auth/logout">Se déconnecter</a>
  `)
})

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ erreur: 'Impossible de vous déconnecter' })
    }
    res.clearCookie('connect.sid')
    res.redirect('/')
  })
})

module.exports = router
