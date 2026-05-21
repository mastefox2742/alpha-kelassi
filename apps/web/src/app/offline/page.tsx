export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6 max-w-sm">
        <p className="text-6xl mb-4">📡</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pas de connexion</h1>
        <p className="text-gray-500 text-sm mb-6">
          Tu es hors-ligne. Tes cours téléchargés restent accessibles dans l'application mobile.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
