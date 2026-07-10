fetch('/auth/me')
  .then((res) => {
    if (!res.ok) window.location.href = '/auth/login'
    return res.json()
  })
  .then((data) => {
    document.getElementById('user-name').textContent = data.username
  })

document.getElementById('logout-btn').addEventListener('click', () => {
  window.location.href = '/auth/logout'
})
