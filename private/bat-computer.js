(async () => {
    const username = prompt("Entrez votre nom d'utilisateur :")
    const password = prompt("Entrez votre mot de passe :")

    const user = await fetch('http://localhost:3000/api/me', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': 'Basic ' + btoa(username + ":" + password)
        }
    });

    if (!user.ok) {
        alert("Échec de l'authentification. Veuillez vérifier vos identifiants.")
        return
    }

    const userData = await user.json();
    document.querySelector('h1').innerText = `Bienvenue, Justicier ${userData.username}`;

    const secrets = await fetch('http://localhost:3000/api/secrets', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': 'Basic ' + btoa(username + ":" + password)
        }
    });
    const secretsData = await secrets.json();

    console.log("Secrets response:", secretsData);

    const arsenalContainer = document.getElementById("arsenal");
    
    // Génération dynamique des cartes Bootstrap
    if (secretsData && secretsData.secret) {
        secretsData.secret.forEach(item => {
            const card = document.createElement("div");
            card.className = "card bg-dark text-light border-secondary";
            
            card.innerHTML = `
                <div class="card-body text-center">
                    <h5 class="card-title">${item.name}</h5>
                    <p class="card-text">${item.desc}</p>
                    <i class="fa ${item.icon} text-warning fs-3"></i>
                </div>
            `;
            arsenalContainer.appendChild(card);
        });
    }
})()