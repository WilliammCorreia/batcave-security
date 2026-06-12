function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next()
  }

  return res.status(401).send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="refresh" content="1; url=/auth/login">
    </head>
    <body>
      <p>401 - Accès refusé. Vous devez être connecté.</p>
      <p>Redirection vers la <a href="/auth/login">page de connexion</a>...</p>
    </body>
    </html>
  `)
}

module.exports = { isAuthenticated }
