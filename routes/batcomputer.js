const express = require('express')
const fs = require('fs')
const path = require('path')
const { isAuthenticated } = require('../middlewares/authCheck')

const router = express.Router()

// Anti XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

router.get('/', isAuthenticated, (req, res) => {
  const template = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'bat-computer.html'),
    'utf8'
  )
  const html = template.replaceAll('{{username}}', escapeHtml(req.session.user.username))
  res.send(html)
})

module.exports = router
