require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const path = require('path')

const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')
const checkJWT = require('./middlewares/checkJWT')

const app = express()

app.use(helmet())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

app.use('/auth', authRouter)
app.use('/bat-computer', batcomputerRouter)

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
