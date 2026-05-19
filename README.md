# Alpha Kelassi 🎓

App mobile/web de préparation aux examens d'État pour le **Congo Brazzaville** (BEPC, BAC).

- **Cours** résumés par matière et niveau
- **Examens d'État officiels** avec corrigés détaillés
- **Tuteur IA Kelassi** — méthode Feynman, analogies locales, flashcards SM-2

## Stack

| Couche | Technologie |
|--------|-------------|
| Web | Next.js 15 (App Router) + Tailwind CSS |
| Mobile | Expo 52 (React Native) + WatermelonDB offline |
| API | Hono (edge) + BullMQ |
| Base de données | Supabase (PostgreSQL + pgvector + Auth + Storage) |
| Cache / Queue | Upstash Redis |
| IA | Gemini text-embedding-004 + gemini-1.5-flash |
| Paiements | Stripe + CinetPay (Mobile Money) |
| SMS OTP | Africa's Talking |
| CI/CD | GitHub Actions + Vercel + EAS Build |

## Structure

```
alpha-kelassi/
├── apps/
│   ├── web/          # Next.js — espace élève web
│   ├── mobile/       # Expo — app Android/iOS
│   └── api/          # Hono — API REST + jobs IA
├── packages/
│   ├── types/        # Types TypeScript partagés
│   ├── ui/           # Composants UI partagés (web)
│   └── config/       # ESLint, Prettier, TS configs
└── supabase/
    └── migrations/   # Schema PostgreSQL + RLS
```

## Démarrage rapide

```bash
# 1. Prérequis: Node 20+, pnpm 9+, Supabase CLI
npm install -g pnpm supabase

# 2. Cloner et installer
git clone https://github.com/apha-tech/alpha-kelassi
cd alpha-kelassi
pnpm install

# 3. Variables d'environnement
cp .env.example .env.local
# Remplissez les clés dans .env.local

# 4. Supabase local (Docker requis)
supabase start
supabase db push

# 5. Lancer tous les apps
pnpm dev
```

## Roadmap (15 semaines)

- **Phase 1 (S1-S4)** — Infrastructure, Auth, Admin, Apps de base
- **Phase 2 (S5-S8)** — RAG + Tuteur IA + Flashcards + Examens
- **Phase 3 (S9-S12)** — Analytics + Performance + Sécurité + Lancement

## Variables d'environnement

Voir `.env.example` pour la liste complète avec commentaires.
