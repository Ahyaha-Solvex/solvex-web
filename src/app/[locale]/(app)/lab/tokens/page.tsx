import { setRequestLocale } from 'next-intl/server';
import { LabShell } from '@/components/ui/LabShell';
import { TokensShowcase } from '@/components/app/TokensShowcase';

export default async function LabTokensPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <TokensShowcase />
    </LabShell>
  );
}
