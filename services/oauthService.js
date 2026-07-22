const PROVIDERS = {
  google: {
    authEndpoint: process.env.GOOGLE_AUTH_ENDPOINT,
    tokenEndpoint: process.env.GOOGLE_TOKEN_ENDPOINT,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: 'openid profile email',
    userInfoEndpoint: null
  },
  github: {
    authEndpoint: process.env.GITHUB_AUTH_ENDPOINT,
    tokenEndpoint: process.env.GITHUB_TOKEN_ENDPOINT,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: 'read:user user:email',
    userInfoEndpoint: process.env.GITHUB_USERINFO_ENDPOINT
  },
  facebook: {
    authEndpoint: process.env.FACEBOOK_AUTH_ENDPOINT,
    tokenEndpoint: process.env.FACEBOOK_TOKEN_ENDPOINT,
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    scope: 'email public_profile',
    userInfoEndpoint: process.env.FACEBOOK_USERINFO_ENDPOINT
  }
}

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`

function getRedirectUri(provider) {
  return `${BASE_URL}/api/auth/callback/${provider}`
}

function isSupported(provider) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, provider)
}

function getAuthUrl(provider, state, codeChallenge) {
  const config = PROVIDERS[provider]
  const url = new URL(config.authEndpoint)
  url.searchParams.append('client_id', config.clientId)
  url.searchParams.append('redirect_uri', getRedirectUri(provider))
  url.searchParams.append('response_type', 'code')
  url.searchParams.append('scope', config.scope)
  url.searchParams.append('state', state)
  url.searchParams.append('code_challenge', codeChallenge)
  url.searchParams.append('code_challenge_method', 'S256')
  return url.toString()
}

async function exchangeCodeForTokens(provider, code, codeVerifier) {
  const config = PROVIDERS[provider]
  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(provider),
      code_verifier: codeVerifier
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(JSON.stringify(errorData))
  }

  return response.json()
}

function decodeIdToken(idToken) {
  const payloadBase64 = idToken.split('.')[1]
  return JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'))
}

async function getUserProfile(provider, tokens) {
  if (provider === 'google') {
    const payload = decodeIdToken(tokens.id_token)
    return { providerId: payload.sub, email: payload.email, name: payload.name }
  }

  const config = PROVIDERS[provider]
  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'User-Agent': 'Batcave-App',
      Accept: 'application/json'
    }
  })
  const data = await response.json()

  if (provider === 'github') {
    let email = data.email
    if (!email) {
      email = await getGithubPrimaryEmail(tokens.access_token)
    }
    return { providerId: String(data.id), email, name: data.name || data.login }
  }

  return { providerId: String(data.id), email: data.email, name: data.name }
}

async function getGithubPrimaryEmail(accessToken) {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Batcave-App',
      Accept: 'application/json'
    }
  })
  const emails = await response.json()
  const primary = Array.isArray(emails) ? emails.find((e) => e.primary) : null
  return primary ? primary.email : null
}

module.exports = {
  isSupported,
  getAuthUrl,
  exchangeCodeForTokens,
  decodeIdToken,
  getUserProfile
}
