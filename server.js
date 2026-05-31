const express = require('express')
const bcrypt = require('bcrypt')
const cors = require('cors')
const db = require('./db')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})

app.post('/register', async (req, res) => {
  let { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send('Nom d\'utilisateur et mot de passe requis.')
  }

  if (password.length < 8) {
    return res.status(400).send('Le mot de passe doit contenir au moins 8 caractères.')
  }

  username = username.trim()

  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).send("Erreur : l'utilisateur existe déjà.")
    }

    const hash = await bcrypt.hash(password, 10)

    const insert = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    )
    insert.run(username, hash)
    res.status(201).send('Utilisateur créé avec succès !')
  } catch (err) {
    res.status(400).send("Erreur lors de l'inscription.")
  }
})

const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // Ajoute l'en-tête pour demander au navigateur d'ouvrir la fenêtre de connexion
    res.setHeader('WWW-Authenticate', 'Basic realm="Administration"')
    return res.status(401).send('Authentification requise')
  }
  const base64 = authHeader.split(' ')[1]
  const [username, password] = Buffer.from(base64, 'base64')
    .toString()
    .split(':')

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username)
  if (user && (await bcrypt.compare(password, user.password_hash))) {
    req.user = user
    next()
  } else {
    return res.status(401).send('Identifiants invalides')
  }
}

app.get('/bat-computer', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/private/bat-computer.html')
});

app.get('/api/secrets', checkAuth, (req, res) => {
  res.status(200).json({ secret: [
    {"name": "Batarang", "desc": "Arme de jet", "icon": "fa-shuriken"}, 
    {"name": "Batmobile", "desc": "Véhicule de Batman", "icon": "fa-car"}, 
    {"name": "Cape", "desc": "Permet de voler", "icon": "fa-cape"}
  ]})
});

app.get('/api/me', checkAuth, (req, res) => {
  res.status(200).json({ username: req.user.username, id: req.user.id })
});

app.post('/api/reports', checkAuth, (req, res) => {
  const { message } = req.body
  if (!message) {
    return res.status(400).send('Message de rapport requis.')
  }

  try {
    const insert = db.prepare(
      'INSERT INTO reports (user_id, message) VALUES (?, ?)'
    )
    insert.run(req.user.id, message)
    res.status(201).send('Rapport soumis avec succès !')
  } catch (err) {
    res.status(400).send("Erreur lors de la soumission du rapport.")
  }
});