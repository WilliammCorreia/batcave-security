const express = require('express')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const path = require('path')
const db = require('../config/db')

const router = express.Router()

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'))
})

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res
        .status(401)
        .send('Identifiants invalides. <a href="/auth/login">Réessayer</a>')
    }
    
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); 

    db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(refreshToken, user.id, expiresAt);

    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 15000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    res.json({ message: 'Connexion réussie' });
    res.redirect('/bat-computer')
  } catch (err) {
    return res.status(500).send('Erreur serveur. Veuillez réessayer plus tard.')
  }
})

router.post('/refresh', (req, res) => {
  const refreshToken = req.headers.cookie?.split(';').find(c => c.trim().startsWith('refreshToken='))?.split('=')[1];
  if (!refreshToken) return res.status(401).json({ erreur: 'Accès refusé' });

  const storedToken = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
  
  if (!storedToken || new Date() > new Date(storedToken?.expires_at)) {
    return res.status(401).json({ erreur: 'Session expirée, reconnectez-vous' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(storedToken.user_id);
  const newToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15s' }
  );

  res.cookie('token', newToken, { httpOnly: true, sameSite: 'strict', maxAge: 15000 });
  res.json({ message: 'Jeton d\'accès rafraîchi.' });
});

router.get('/logout', (req, res) => {
  const refreshToken = req.headers.cookie?.split(';').find(c => c.trim().startsWith('refreshToken='))?.split('=')[1];
  
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Déconnexion réussie.' });
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
