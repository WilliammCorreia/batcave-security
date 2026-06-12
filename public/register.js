document.getElementById('register-form').onsubmit = async e => {
  e.preventDefault()
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value

  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const messageElement = document.getElementById('message')
  if (response.ok) {
    messageElement.style.color = 'lightgreen'
    messageElement.innerText = 'Inscription réussie ! Redirection...'
    setTimeout(() => (window.location.href = '/auth/login'), 1000)
  } else {
    messageElement.style.color = 'salmon'
    messageElement.innerText = await response.text()
  }
}
