import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#FAF8F3] text-[#14201A] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-sm text-[#5C675F] mb-4">Page non trouvée / Page Not Found</p>
          <Link href="/" className="text-xs font-semibold text-[#006233] underline">
            Retour à l&apos;accueil / Return Home
          </Link>
        </div>
      </body>
    </html>
  );
}
