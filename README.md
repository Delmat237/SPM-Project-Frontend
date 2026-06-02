# SPM — Scrum Project Manager

> Plateforme de gestion de projets agile style **Jira / Trello** — développée par la **Cellule Projet du Club GI de l'ENSPY**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Aperçu

SPM est une application web full-featured de gestion de projets agile. Elle centralise les projets, tâches, équipes, tableaux Kanban, planning Gantt, analytiques et notifications dans une interface moderne, responsive et bilingue (dark/light mode).

Le frontend communique avec un backend **Spring Boot 3 / PostgreSQL** via une API REST sécurisée par JWT.

---

## Fonctionnalités

### Gestion de projets
- Création, édition, archivage et suppression de projets
- Visibilité publique / privée
- Tableau de bord avec statistiques en temps réel

### Vues par projet (6 onglets)

| Vue | Description |
|---|---|
| **Kanban** | Tableau drag & drop — 5 colonnes : À faire · En cours · En revue · Bloqué · Terminé |
| **Backlog** | Liste triable/filtrable avec groupement par statut ou priorité, indicateurs de retard |
| **Gantt** | Timeline mensuelle avec barres colorées, tooltips et légende |
| **Analytics** | KPIs, taux de complétion (donut), vélocité par sprint, burndown chart, export CSV/JSON |
| **Membres** | Invitation par email, gestion des rôles (Owner · Admin · Member · Reader), retrait |
| **Paramètres** | Édition du projet, workflow, notifications, archivage, suppression avec confirmation |

### Gestion des tâches
- Création rapide depuis le Kanban ou le Backlog
- **Détail de tâche complet** : titre, description, statut, priorité, assignation, échéance
- **Sous-tâches** : création et toggle (terminé / en cours) avec barre de progression
- **Commentaires** : ajout, édition, suppression en temps réel
- **Pièces jointes** : upload, téléchargement, suppression
- Autosave automatique (800 ms après la dernière frappe)

### Collaboration & notifications
- Notifications en temps réel (commentaires, mentions, invitations, changements de statut)
- Filtrage des notifications par type (Toutes · Non lues · Mentions)
- Marquer comme lu individuellement ou en masse

### Compte & profil
- Authentification JWT (login / register / reset password / OTP)
- SSO Google
- Profil utilisateur : édition du nom, bio, photo de profil
- Changement de mot de passe avec indicateur de robustesse
- Comptes liés (Google, GitHub)
- Mode sombre / clair persistant

---

## Stack technique

| Catégorie | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Langage | TypeScript 5 |
| Temps réel | STOMP / SockJS (WebSocket) |
| Communication API | Fetch natif + couche `apiClient` avec injection JWT |
| Auth | JWT Bearer (Spring Security HS512) |
| Icônes | SVG inline custom (`lib/icons.tsx`) |

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Backend SPM ([`SPM-Project-Backend`](https://github.com/club-genie-informatique-enspy/SPM-Project-Backend)) démarré sur le port **8082**

---

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/club-genie-informatique-enspy/SPM-Project-Frontend.git
cd SPM-Project-Frontend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local : NEXT_PUBLIC_API_URL=http://localhost:8082
```

---

## Lancer l'application

```bash
# Développement (hot reload)
npm run dev
# → http://localhost:3000

# Production
npm run build
npm run start
```

---

## Scripts disponibles

```bash
npm run dev      # Serveur de développement Next.js
npm run build    # Compilation production
npm run start    # Lancement de la version compilée
npm run lint     # Analyse ESLint
```

---

## Structure du projet

```
app/
├── auth/                        # Login, register, reset password, OTP
├── dashboard/
│   ├── page.tsx                 # Tableau de bord
│   ├── projects/
│   │   ├── page.tsx             # Liste des projets
│   │   ├── new/                 # Création de projet
│   │   └── [id]/
│   │       ├── kanban/          # Vue Kanban
│   │       ├── backlog/         # Vue Backlog
│   │       ├── gantt/           # Vue Gantt / Timeline
│   │       ├── analytics/       # Analytics & exports
│   │       ├── members/         # Gestion des membres
│   │       ├── settings/        # Paramètres du projet
│   │       └── tasks/[taskId]/  # Détail d'une tâche
│   ├── notifications/           # Centre de notifications
│   ├── profile/                 # Profil utilisateur
│   └── admin/                   # Administration du compte

components/
├── layout/                      # Sidebar, Navbar, DashboardLayout
└── ui/                          # TaskCard, ProjectCard, Modal, Badge, Avatar…

lib/
├── api/
│   ├── projects.ts              # CRUD projets + membres
│   ├── tasks.ts                 # CRUD tâches + kanban/gantt/subtasks
│   ├── comments.ts              # CRUD commentaires
│   ├── attachments.ts           # Upload / téléchargement pièces jointes
│   ├── notifications.ts         # Notifications + mark-as-read
│   └── analytics.ts             # Summary, burndown, velocity, export
├── api-client.ts                # Fetch wrapper avec JWT Bearer auto
├── icons.tsx                    # Icônes SVG centralisées
└── mock-data.ts                 # Données de fallback (si backend indisponible)

types/
└── index.ts                     # Types TypeScript (Task, Project, Comment…)
```

---

## Variables d'environnement

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8082
```

---

## Contributeurs

| Nom | Email |
|---|---|
| Azangue Delmat | azangueleonel9@gmail.com |
| Tipainess | tipainess@gmail.com |
| Samuel Ftagat | samuelftagat@gmail.com |
| Maevat Chounou | maevatchounou@gmail.com |

---

## Liens

- **Backend** : [SPM-Project-Backend](https://github.com/club-genie-informatique-enspy/SPM-Project-Backend)
- **Organisation** : [Club GI ENSPY](https://github.com/club-genie-informatique-enspy)

---

*Club Génie Informatique — École Nationale Supérieure Polytechnique de Yaoundé*
