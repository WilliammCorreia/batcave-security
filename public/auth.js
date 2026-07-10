let currentUsername = ''

function showMessage(text, isError = false) {
  const el = document.getElementById('login-message')
  el.textContent = text
  el.style.color = isError ? 'salmon' : 'lightgreen'
}

async function login() {
  currentUsername = document.getElementById('username').value
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUsername,
      password: document.getElementById('password').value
    })
  })
  const data = await res.json()

  if (data.requires2FA) {
    document.getElementById('zone2FA').style.display = 'block'
    showMessage(data.message)
  } else if (data.success) {
    window.location.href = '/dashboard'
  } else {
    showMessage(data.error, true)
  }
}

async function verify2FA() {
  const res = await fetch('/auth/verify-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUsername,
      code: document.getElementById('code2FA').value
    })
  })
  const data = await res.json()

  if (data.success) {
    window.location.href = '/dashboard'
  } else {
    showMessage(data.error, true)
  }
}

async function chargeQR() {
  currentUsername = document.getElementById('username').value
  const res = await fetch('/auth/setup-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUsername })
  })
  const data = await res.json()

  if (data.qrCode) {
    document.getElementById('qrImg').src = data.qrCode
    document.getElementById('qrZone').style.display = 'block'
  } else {
    showMessage(data.error, true)
  }
}

async function confirm2FAActivation() {
  const res = await fetch('/auth/confirm-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUsername,
      code: document.getElementById('confirmCode').value
    })
  })
  const data = await res.json()
  showMessage(data.message || data.error, !data.success)
}

document.getElementById('btn-login').addEventListener('click', login)
document.getElementById('btn-verify').addEventListener('click', verify2FA)
document.getElementById('btn-qr').addEventListener('click', chargeQR)
document.getElementById('btn-confirm').addEventListener('click', confirm2FAActivation)
