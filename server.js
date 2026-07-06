require('dotenv').config()

const express = require('express')

const { loadSession } = require('./middlewares/session')
const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))
app.use(loadSession)

app.use('/auth', authRouter)
app.use('/bat-computer', batcomputerRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})
