const express = require('express')
const bcrypt = require('bcrypt')
const path = require('path')
const db = require('../config/db')

const router = express.Router()

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'))
})

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res
      .status(401)
      .send('Identifiants invalides. <a href="/auth/login">Réessayer</a>')
  }

  req.session.regenerate((err) => {
    if (err) return next(err)

    req.session.user = { username: user.username }

    req.session.save((err) => {
      if (err) return next(err)
      res.redirect('/bat-computer')
    })
  })
})

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('bat_identity')
    res.redirect('/auth/login')
  })
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
