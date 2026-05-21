import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Kelassi',
  description: 'Comment Kelassi collecte, utilise et protège vos données personnelles.',
}

export default function ConfidentialitePage() {
  const updated = '21 mai 2026'

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">← Retour</Link>
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : {updated}</p>

      <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Qui sommes-nous ?</h2>
          <p>
            Kelassi est une application éducative développée par Alpha-Tech, destinée aux élèves
            congolais préparant le BEPC et le BAC. Siège social : Brazzaville, République du Congo.
            Contact : <a href="mailto:privacy@kelassi.app" className="text-blue-600">privacy@kelassi.app</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Données collectées</h2>
          <p className="mb-2">Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Identification</strong> : numéro de téléphone ou adresse e-mail (à l'inscription)</li>
            <li><strong>Profil</strong> : prénom/nom (optionnel), niveau scolaire</li>
            <li><strong>Usage</strong> : cours consultés, questions posées au tuteur IA, résultats de flashcards</li>
            <li><strong>Paiement</strong> : référence de transaction Stripe ou CinetPay (jamais les numéros de carte)</li>
            <li><strong>Technique</strong> : adresse IP (pour la protection anti-abus), logs d'erreurs</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Protection des mineurs</h2>
          <p>
            Kelassi est principalement utilisé par des élèves mineurs. Nous appliquons des mesures
            de protection renforcées : aucune publicité ciblée, aucune vente de données,
            aucun contenu généré par les utilisateurs publiquement visible. Les données des mineurs
            ne sont partagées avec aucun tiers à des fins commerciales.
          </p>
          <p className="mt-2">
            Si un parent ou tuteur légal souhaite accéder aux données de son enfant mineur ou
            les supprimer, il peut nous contacter à l'adresse ci-dessus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Finalités du traitement</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fourniture du service (cours, examens, tuteur IA, flashcards)</li>
            <li>Personnalisation de la progression (algorithme SM-2, recommandations)</li>
            <li>Amélioration du service (analyse agrégée anonymisée)</li>
            <li>Sécurité et prévention des abus (rate limiting, détection fraude paiement)</li>
            <li>Communication transactionnelle (OTP, confirmations d'abonnement)</li>
          </ul>
          <p className="mt-2">Nous n'utilisons pas vos données à des fins publicitaires.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Données de compte : jusqu'à la suppression du compte + 30 jours</li>
            <li>Historique de chat IA : 12 mois glissants</li>
            <li>Logs techniques : 90 jours</li>
            <li>Données de paiement : 5 ans (obligation légale)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Partage des données</h2>
          <p className="mb-2">Vos données sont partagées uniquement avec les sous-traitants nécessaires :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase</strong> (hébergement base de données, authentification) — Europe/US</li>
            <li><strong>Google Gemini</strong> (traitement IA des questions) — vos questions sont envoyées à l'API Google</li>
            <li><strong>Stripe</strong> (paiement international)</li>
            <li><strong>CinetPay</strong> (paiement Afrique centrale)</li>
            <li><strong>Africa's Talking</strong> (envoi SMS OTP)</li>
          </ul>
          <p className="mt-2">Nous n'avons pas de partenaires publicitaires.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Vos droits</h2>
          <p className="mb-2">Vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Accès</strong> : télécharger toutes vos données (fonctionnalité disponible dans votre compte)</li>
            <li><strong>Rectification</strong> : corriger vos informations depuis les paramètres</li>
            <li><strong>Suppression</strong> : supprimer définitivement votre compte et toutes vos données</li>
            <li><strong>Portabilité</strong> : exporter vos données au format JSON</li>
            <li><strong>Opposition</strong> : désactiver l'analyse d'usage en nous contactant</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits :{' '}
            <Link href="/compte/supprimer" className="text-blue-600 hover:underline">supprimer mon compte</Link>
            {' '}ou écrire à{' '}
            <a href="mailto:privacy@kelassi.app" className="text-blue-600">privacy@kelassi.app</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Sécurité</h2>
          <p>
            Vos données sont chiffrées en transit (TLS 1.3) et au repos. L'accès est protégé
            par authentification OTP, rate limiting, et Row Level Security (RLS) Supabase.
            Les mots de passe ne sont jamais stockés (authentification sans mot de passe).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Cookies</h2>
          <p>
            Kelassi utilise uniquement des cookies de session nécessaires au fonctionnement
            (authentification Supabase). Aucun cookie publicitaire ou de tracking tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Modifications</h2>
          <p>
            Toute modification substantielle sera notifiée par e-mail ou notification in-app
            au moins 14 jours avant son entrée en vigueur.
          </p>
        </section>
      </div>
    </div>
  )
}
