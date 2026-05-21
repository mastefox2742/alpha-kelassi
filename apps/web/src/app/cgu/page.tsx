import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — Kelassi',
  description: 'Conditions d\'utilisation de la plateforme éducative Kelassi.',
}

export default function CguPage() {
  const updated = '21 mai 2026'

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">← Retour</Link>
      <h1 className="text-3xl font-bold mb-2">Conditions Générales d'Utilisation</h1>
      <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : {updated}</p>

      <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Objet</h2>
          <p>
            Les présentes CGU régissent l'utilisation de la plateforme Kelassi (application web et mobile),
            service éducatif proposé par Alpha-Tech. En créant un compte, vous acceptez ces conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Accès au service</h2>
          <p>
            Kelassi est accessible à toute personne disposant d'un téléphone ou d'un accès internet.
            Pour les utilisateurs mineurs (moins de 18 ans), l'inscription est autorisée avec l'accord
            d'un parent ou tuteur légal, qui reste responsable de l'utilisation du service.
          </p>
          <p className="mt-2">
            Un compte gratuit donne accès aux cours et examens publics et à 10 questions IA par jour.
            L'abonnement Premium déverrouille tous les contenus et augmente le quota à 200 questions/jour.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Utilisation acceptable</h2>
          <p className="mb-2">Il est interdit de :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Partager vos identifiants ou accéder au compte d'autrui</li>
            <li>Tenter de contourner les mesures de sécurité ou les limitations</li>
            <li>Utiliser le tuteur IA pour générer du contenu illégal ou nuisible</li>
            <li>Revendre ou redistribuer les contenus Premium de la plateforme</li>
            <li>Utiliser des bots ou scripts pour accéder automatiquement au service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Abonnement Premium</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Tarif : 2 000 FCFA/mois ou 20 000 FCFA/an (tarifs indicatifs, susceptibles d'évoluer)</li>
            <li>Paiement via Stripe (carte internationale) ou CinetPay (Mobile Money, carte africaine)</li>
            <li>Renouvellement automatique sauf résiliation</li>
            <li>Résiliation possible à tout moment depuis les paramètres — effet à la fin de la période en cours</li>
            <li>Pas de remboursement pour les périodes entamées, sauf défaillance technique majeure de notre part</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Tuteur IA — Limitations</h2>
          <p>
            Le tuteur Kelassi est basé sur un modèle d'intelligence artificielle (Google Gemini).
            Les réponses sont fournies à titre éducatif et ne remplacent pas l'enseignement d'un professeur.
            Alpha-Tech ne garantit pas l'exactitude absolue des réponses et décline toute responsabilité
            en cas d'erreur dans le contexte d'un examen officiel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Propriété intellectuelle</h2>
          <p>
            Les cours et examens mis en ligne restent la propriété de leurs auteurs respectifs
            (État congolais pour les examens officiels). La compilation, la présentation et les
            outils IA sont la propriété d'Alpha-Tech. Les utilisateurs n'acquièrent aucun droit
            de reproduction ou redistribution sur ces contenus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Disponibilité du service</h2>
          <p>
            Kelassi s'efforce d'assurer une disponibilité de 99,5% mais ne peut garantir un
            accès ininterrompu. Des maintenances peuvent être effectuées, de préférence hors
            des périodes d'examens. Aucune compensation n'est due pour une interruption de moins de 24h.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Résiliation et suppression du compte</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis{' '}
            <Link href="/compte/supprimer" className="text-blue-600 hover:underline">cette page</Link>.
            Alpha-Tech se réserve le droit de suspendre un compte en cas de violation de ces CGU,
            après notification sauf en cas de fraude avérée.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Droit applicable</h2>
          <p>
            Les présentes CGU sont soumises au droit de la République du Congo.
            Tout litige sera soumis aux tribunaux compétents de Brazzaville.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Contact</h2>
          <p>
            Pour toute question : <a href="mailto:support@kelassi.app" className="text-blue-600">support@kelassi.app</a>
          </p>
        </section>
      </div>
    </div>
  )
}
