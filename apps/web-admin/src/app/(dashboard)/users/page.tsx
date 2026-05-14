'use client';

import { Users } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';

export default function UsersPage() {
  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">Utilisateurs</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Liste des candidats, recruteurs et admins. Suspension, rôle, KYC.
      </p>
      <Card>
        <EmptyState
          icon={<Users size={28} />}
          title="Bientôt"
          hint="Liste des utilisateurs avec filtres par rôle/statut, recherche, et actions (suspendre, changer le rôle)."
        />
      </Card>
    </div>
  );
}
