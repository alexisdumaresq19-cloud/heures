# Inspections QR — Machinerie de chantier

Système d'inspection mécanique rapide par QR code pour la machinerie sur les chantiers.

## Comment ça fonctionne

1. **Bureau** crée une fiche machine dans l'admin web → imprime le QR code → colle sur la machine.
2. **Employé sur le chantier** scanne le QR avec l'app mobile → remplit le formulaire d'inspection (checklist, défauts, photos).
3. **Soumission** → données sauvegardées dans Supabase + courriel automatique envoyé au bureau.
4. **Bureau** consulte l'historique de chaque machine dans l'admin web.

## Structure du projet

```
inspections/
├── mobile/              # App React Native (Expo) — pour les employés terrain
├── admin/               # App web React (Vite) — pour le bureau
└── supabase/
    ├── migrations/      # Schéma SQL (tables machines, inspections, etc.)
    └── functions/
        └── send-inspection-email/  # Edge Function: envoie le courriel au bureau
```

## Stack technique

- **Frontend mobile**: React Native + Expo (iOS + Android depuis un même code)
- **Frontend bureau**: React + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Courriel**: Resend (via Edge Function Supabase)

## Démarrage

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project.
2. Récupérer `SUPABASE_URL` et `SUPABASE_ANON_KEY` (Project Settings → API).
3. Exécuter les migrations:
   ```bash
   cd supabase
   supabase link --project-ref <votre-ref>
   supabase db push
   ```
4. Créer un bucket Storage nommé `inspection-photos` (privé).

### 2. Configurer l'envoi de courriels (Resend)

1. Créer un compte sur [resend.com](https://resend.com) → obtenir une API key.
2. Configurer les secrets de l'Edge Function:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set OFFICE_EMAIL=bureau@votreentreprise.com
   supabase secrets set FROM_EMAIL=inspections@votredomaine.com
   ```
3. Déployer la fonction:
   ```bash
   supabase functions deploy send-inspection-email
   ```

### 3. Lancer l'admin web (bureau)

```bash
cd admin
npm install
cp .env.example .env   # remplir SUPABASE_URL et SUPABASE_ANON_KEY
npm run dev
```

### 4. Lancer l'app mobile

```bash
cd mobile
npm install
cp .env.example .env   # remplir SUPABASE_URL et SUPABASE_ANON_KEY
npx expo start
```

Scanner le QR avec l'app **Expo Go** (App Store / Play Store) pour tester sans build natif.

Pour générer un APK/IPA standalone:
```bash
npx eas build --platform android
npx eas build --platform ios
```

### 5. Premier compte admin

L'app mobile et l'admin web exigent maintenant un login.

1. Lancer l'app mobile, créer un compte (Nom + courriel + mot de passe).
2. Dans Supabase → SQL Editor, promouvoir ce compte en admin:
   ```sql
   update profiles set role = 'admin' where full_name = 'Votre Nom';
   -- ou par courriel:
   update profiles set role = 'admin'
     where id = (select id from auth.users where email = 'vous@exemple.com');
   ```
3. Se connecter à l'admin web avec ces identifiants.
4. Tous les comptes employés suivants peuvent être créés depuis l'app mobile
   (rôle `inspector` par défaut). Vous pourrez les promouvoir admin depuis
   la page **Utilisateurs** de l'admin web.

> **Astuce:** dans Supabase → Authentication → Settings, vous pouvez désactiver
> "Confirm email" pendant la phase de test pour ne pas avoir à confirmer chaque
> nouveau compte par courriel.

## MVP — fonctionnalités v1

- [x] Génération de QR par machine (admin)
- [x] Formulaire d'inspection mobile (checklist + commentaires)
- [x] Photos sur les défauts
- [x] Historique des inspections par machine
- [x] Courriel automatique au bureau à chaque soumission
- [x] Authentification (admin bureau / inspector terrain) avec RLS

## Évolutions possibles (v2+)

- Mode hors-ligne avec synchronisation
- Signature numérique de l'employé
- Alertes SMS pour défauts critiques
- Tableau de bord avec statistiques
- Export Excel des inspections
- Multi-entreprise / multi-chantier
