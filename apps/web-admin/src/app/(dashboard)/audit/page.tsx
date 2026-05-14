'use client';

import { ScrollText } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';

export default function AuditPage() {
  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">Journal d&apos;audit</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Toutes les actions sensibles (publications, rejets, vérifications) avec l&apos;auteur et la date.
      </p>
      <Card>
        <EmptyState
          icon={<ScrollText size={28} />}
          title="Bientôt"
          hint="Affichage du journal d'audit déjà stocké côté backend (table audit_log)."
        />
      </Card>
    </div>
  );
}
