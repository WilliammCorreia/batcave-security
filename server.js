require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const session = require('express-session')
const path = require('path')

const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')
const oauthRouter = require('./routes/oauthRoutes')
const checkJWT = require('./middlewares/checkJWT')

const app = express()

app.use(helmet())

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 }
}))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

app.use('/auth', authRouter)
app.use('/bat-computer', batcomputerRouter)
app.use('/api/auth', oauthRouter)

app.get('/dashboard', checkJWT, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get(/.*$/, (req, res) => {
  res.redirect('/auth/login')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})
