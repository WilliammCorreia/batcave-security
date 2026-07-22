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

---

# Batcave Security — TP5 (OAuth 2.0 & OpenID Connect)

Délégation de l'authentification à trois fournisseurs d'identité : **Google**,
**GitHub** et **Facebook**. Flux `Authorization Code + PKCE` codé *from scratch*
(pas de Passport.js) avec `express`, `fetch` natif et `crypto`.

## Arborescence TP5

```
config/db.js                  # + tables oauth_sessions et oauth_users
services/cryptoService.js     # state + PKCE (code_verifier / code_challenge)
services/oauthService.js      # config des 3 fournisseurs, URL d'auth, échange, profil
models/oauthModel.js          # save/get/delete OAuth session + upsert utilisateur
controllers/oauthController.js # redirectToProvider + handleCallback
routes/oauthRoutes.js         # /api/auth/login|callback/:provider, /dashboard, /logout
public/index.html             # boutons "Se connecter avec ..."
```

## Le flux en 4 étapes

1. `GET /api/auth/login/:provider` → génère `state` + PKCE, les stocke dans
   `oauth_sessions`, puis redirige vers le serveur d'autorisation.
2. `GET /api/auth/callback/:provider` → le fournisseur renvoie un `code` (+ le
   `state`). On vérifie le `state` en base (anti-CSRF) et on le consomme.
3. Échange serveur à serveur du `code` (+ `code_verifier`) contre les jetons.
4. On récupère l'identité, on fait un *upsert* dans `oauth_users`, puis on ouvre
   une session Express (`req.session`) et on redirige vers `/api/auth/dashboard`.

## OAuth 2.0 vs OpenID Connect

- **Google (OIDC)** : renvoie un `id_token` (JWT) que l'on décode directement.
- **GitHub / Facebook (OAuth 2.0 pur)** : pas d'`id_token`, on interroge leur
  *userinfo endpoint* avec le jeton d'accès (`https://api.github.com/user`,
  `https://graph.facebook.com/me`).

## Base de données (Étape 0)

Un identifiant `12345` chez GitHub ≠ `12345` chez Facebook. La table
`oauth_users` a donc une contrainte `UNIQUE (provider, provider_id)`, et le
`ON CONFLICT` de l'*upsert* porte sur ce couple.

## Configuration des consoles

Chaque fournisseur doit déclarer l'URI de redirection exacte :

| Fournisseur | Redirect URI à déclarer |
|-------------|--------------------------|
| Google      | `http://localhost:3000/api/auth/callback/google`   |
| GitHub      | `http://localhost:3000/api/auth/callback/github`   |
| Facebook    | `http://localhost:3000/api/auth/callback/facebook` |

Renseignez les identifiants dans `.env` (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`,
`FACEBOOK_CLIENT_ID`, et les secrets correspondants). Les identifiants Facebook
restent à compléter.

## Gestion des erreurs (Étape 3)

Si l'utilisateur clique sur « Annuler », le fournisseur redirige vers le callback
avec `?error=access_denied`. Le contrôleur intercepte ce paramètre et affiche une
page d'erreur propre (401) au lieu de chercher un code inexistant.
