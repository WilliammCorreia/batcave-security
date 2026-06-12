## CORREIA William - IW2

# Batcave Security — TP2 (sessions)

Système d'authentification par **session** (cookie `bat_identity`) qui remplace
le Basic Auth du TP1.

## Lancer le projet

```bash
npm install
npm run dev
```

Le serveur écoute sur le port défini dans `.env` (`PORT=3000`).

## Arborescence

```
config/db.js            # initialisation de la base SQLite
middlewares/authCheck.js # isAuthenticated : protège les routes
routes/auth.js           # GET/POST /auth/login, /auth/logout, /auth/register
routes/batcomputer.js    # GET /bat-computer (protégé)
views/                   # pages HTML (login, bat-computer, register)
public/                  # JS/CSS client accessibles à tous
.env                     # PORT + SESSION_SECRET (jamais commité)
server.js                # point d'entrée : middlewares + montage des routeurs
```

## Parcours

1. `GET /auth/register` → créer un compte
2. `GET /auth/login` → formulaire de connexion
3. `POST /auth/login` → vérifie le mot de passe (`bcrypt.compare`), régénère la
   session (anti session-fixation) puis redirige vers `/bat-computer`
4. `GET /bat-computer` → page protégée personnalisée (nom de l'agent en session)
5. `GET /auth/logout` → détruit la session + efface le cookie

## Sécurité du cookie de session

- `name: bat_identity` (masque la techno)
- `httpOnly: true` (inaccessible au JS client → anti-XSS)
- `sameSite: 'strict'` (anti-CSRF)
- `maxAge: 1800000` (déconnexion auto après 30 min)
- clé de signature externalisée dans `.env` (`SESSION_SECRET`)
