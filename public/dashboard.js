// Récupération des infos de l'utilisateur connecté via l'API protégée
fetch('/api/user/me')
  .then(res => {
      if(!res.ok) window.location.href = '/';
      return res.json();
  })
  .then(data => {
      document.getElementById('user-email').innerText = data.email;
      document.getElementById('user-role').innerText = data.role;
  });

// Déconnexion
document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
});