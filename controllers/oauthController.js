const cryptoService = require('../services/cryptoService')
const oauthService = require('../services/oauthService')
const oauthModel = require('../models/oauthModel')

function redirectToProvider(req, res) {
  const provider = req.params.provider

  if (!oauthService.isSupported(provider)) {
    return res.status(404).send('Fournisseur d\'identité inconnu.')
  }

  const state = cryptoService.generateState()
  const codeVerifier = cryptoService.generateCodeVerifier()
  const codeChallenge = cryptoService.generateCodeChallenge(codeVerifier)

  oauthModel.saveOAuthSession(state, codeVerifier, provider)

  const authUrl = oauthService.getAuthUrl(provider, state, codeChallenge)

  res.redirect(authUrl)
}

async function handleCallback(req, res) {
  const provider = req.params.provider
  const { code, state, error } = req.query

  if (error) {
    return res.status(401).send(`
      <h1>Connexion annulée</h1>
      <p>L'autorisation auprès de ${provider} a échoué (${error}).</p>
      <a href="/">Retour à l'accueil</a>
    `)
  }

  const session = oauthModel.getOAuthSession(state)
  if (!session) {
    return res.status(403).send('Invalid state token. Access Denied.')
  }
  oauthModel.deleteOAuthSession(state)

  try {
    const tokens = await oauthService.exchangeCodeForTokens(
      provider,
      code,
      session.code_verifier
    )

    const userProfile = await oauthService.getUserProfile(provider, tokens)
    oauthModel.upsertUser(provider, userProfile)

    req.session.userId = userProfile.providerId
    req.session.userName = userProfile.name
    req.session.provider = provider

    res.redirect('/api/auth/dashboard')
  } catch (error) {
    console.error(error)
    res.status(500).send('Authentication workflow failed.')
  }
}

module.exports = { redirectToProvider, handleCallback }
