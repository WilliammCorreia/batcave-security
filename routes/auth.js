const express = require('express')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const path = require('path')
const { authenticator } = require('@otplib/preset-v11')
const qrcode = require('qrcode')
const db = require('../config/db')
const checkJWT = require('../middlewares/checkJWT')

const router = express.Router()

const ACCESS_COOKIE = { httpOnly: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 }
const REFRESH_COOKIE = { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 }

function issueTokens(res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  const refreshToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(refreshToken, user.id, expiresAt)

  res.cookie('token', token, ACCESS_COOKIE)
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE)
}

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'))
})


router.post('/setup-2fa', async (req, res) => {
  const { username } = req.body

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }

  const secret = authenticator.generateSecret()

  // C'est une URI et pas seulement le secret
  const otpauth = authenticator.keyuri(username, 'Batcave', secret)

  db.prepare('UPDATE users SET two_factor_secret = ? WHERE username = ?').run(secret, username)

  const qrCodeImage = await qrcode.toDataURL(otpauth)

  res.json({ qrCode: qrCodeImage, secret })
})

router.post('/confirm-2fa', (req, res) => {
  const { username, code } = req.body

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !user.two_factor_secret) {
    return res.status(404).json({ error: 'Aucune 2FA en attente pour cet utilisateur' })
  }

  const isValid = authenticator.check(code, user.two_factor_secret)
  if (!isValid) {
    return res.status(401).json({ error: 'Code incorrect. Activation avortée.' })
  }

  db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE username = ?').run(username)

  res.json({ success: true, message: 'La 2FA est désormais activée sur votre compte !' })
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }

    // 403 Forbidden et non 401
    if (user.two_factor_enabled === 0 || !user.two_factor_secret) {
      return res.status(403).json({
        error: 'Accès refusé. La double authentification est obligatoire. Veuillez l\'activer.'
      })
    }

    if (user.two_factor_enabled === 1) {
      return res.json({
        requires2FA: true,
        message: 'Étape 1 validée. Veuillez fournir votre code à 6 chiffres.',
        username: user.username
      })
    }
  } catch (error) {
    console.error('Erreur lors du login :', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
})

router.post('/verify-2fa', (req, res) => {
  const { username, code } = req.body

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const isValid = authenticator.check(code, user.two_factor_secret)
  if (!isValid) {
    return res.status(401).json({ error: 'Code 2FA invalide ou expiré' })
  }

  issueTokens(res, user)

  res.json({ success: true, message: 'Authentification double facteur réussie !' })
})

router.get('/me', checkJWT, (req, res) => {
  res.json({ username: req.user.username })
})

router.post('/refresh', (req, res) => {
  const refreshToken = req.headers.cookie
    ?.split(';')
    .find((c) => c.trim().startsWith('refreshToken='))
    ?.split('=')[1]
  if (!refreshToken) return res.status(401).json({ error: 'Accès refusé' })

  const storedToken = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken)

  if (!storedToken || new Date() > new Date(storedToken.expires_at)) {
    return res.status(401).json({ error: 'Session expirée, reconnectez-vous' })
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(storedToken.user_id)
  const newToken = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  res.cookie('token', newToken, ACCESS_COOKIE)
  res.json({ message: 'Jeton d\'accès rafraîchi.' })
})

router.get('/logout', (req, res) => {
  const refreshToken = req.headers.cookie
    ?.split(';')
    .find((c) => c.trim().startsWith('refreshToken='))
    ?.split('=')[1]

  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken)
  }

  res.clearCookie('token')
  res.clearCookie('refreshToken')
  res.redirect('/auth/login')
})

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'))
})

router.post('/register', async (req, res) => {
  let { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send("Nom d'utilisateur et mot de passe requis.")
  }
  if (password.length < 8) {
    return res.status(400).send('Le mot de passe doit contenir au moins 8 caractères.')
  }

  username = username.trim()

  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (existingUser) {
      return res.status(409).send("Erreur : l'utilisateur existe déjà.")
    }

    const hash = await bcrypt.hash(password, 10)
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash)
    res.status(201).send('Utilisateur créé avec succès !')
  } catch (err) {
    res.status(400).send("Erreur lors de l'inscription.")
  }
})

module.exports = router
