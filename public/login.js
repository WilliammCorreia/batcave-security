document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error');

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (response.ok) {
    // Le navigateur a reçu le cookie JWT, on redirige vers le dashboard sécurisé
    window.location.href = '/dashboard';
  } else {
    const data = await response.json();
    errorDiv.innerText = data.erreur;
    errorDiv.style.display = 'block';
  }
});