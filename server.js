require('dotenv').config()

const express = require('express')
const session = require('express-session')

const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

app.use(session({
  name: 'bat_identity',                 
  secret: process.env.SESSION_SECRET,   
  resave: false,                        // ne réécrit pas la session si rien n'a changé
  saveUninitialized: false,             // pas de cookie tant qu'on n'a rien stocké
  cookie: {
    httpOnly: true,      
    sameSite: 'strict',  
    maxAge: 1800000      
    // secure: true
  }
}))

app.use('/auth', authRouter)
app.use('/bat-computer', batcomputerRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})
