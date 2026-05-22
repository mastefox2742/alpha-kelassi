'use client'

import dynamic from 'next/dynamic'

function DocumentSkeleton() {
  return (
    <div className="px-5 py-8 animate-pulse space-y-4 max-w-3xl mx-auto">
      <div className="h-5 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-4/5" />
      <div className="h-5 bg-gray-100 rounded w-1/2 mt-6" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
    </div>
  )
}

// dynamic + ssr:false DOIT être dans un Client Component (Next.js 15)
const DocumentReaderDynamic = dynamic(
  () => import('@/components/document-reader').then((m) => m.DocumentReader),
  { ssr: false, loading: () => <DocumentSkeleton /> }
)

export function DocumentReaderClient({ text }: { text: string }) {
  return <DocumentReaderDynamic text={text} />
}
