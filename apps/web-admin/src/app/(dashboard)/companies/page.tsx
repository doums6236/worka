'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { companiesApi, type Company } from '@/lib/endpoints';

type Filter = 'all' | 'pending' | 'verified';

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  });

  const verify = useMutation({
    mutationFn: (id: string) => companiesApi.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter === 'pending') list = list.filter((c) => !c.verifiedAt);
    if (filter === 'verified') list = list.filter((c) => !!c.verifiedAt);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      pending: list.filter((c) => !c.verifiedAt).length,
      verified: list.filter((c) => !!c.verifiedAt).length,
    };
  }, [data]);

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink">Entreprises</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Vérifie l&apos;identité des entreprises avant qu&apos;elles ne publient des offres.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'verified'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-ink-secondary hover:bg-surface-bgLight hover:text-primary'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'pending' ? 'À vérifier' : 'Vérifiées'}
              <span className="ml-1.5 opacity-80">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border-[1.5px] border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={28} />}
            title={search ? 'Aucun résultat' : "Aucune entreprise"}
            hint={
              search
                ? "Essaie d'autres mots-clés ou retire les filtres."
                : 'Les entreprises apparaissent quand un recruteur crée son compte.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted">
              <tr>
                <Th>Entreprise</Th>
                <Th>Secteur</Th>
                <Th>Pays</Th>
                <Th>Statut</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CompanyRow
                  key={c.id}
                  c={c}
                  onVerify={() => verify.mutate(c.id)}
                  verifying={verify.isPending && verify.variables === c.id}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function CompanyRow({
  c,
  onVerify,
  verifying,
}: {
  c: Company;
  onVerify: () => void;
  verifying: boolean;
}) {
  const initials = c.name.slice(0, 2).toUpperCase();
  return (
    <tr className="border-t border-line">
      <Td>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-bgLight text-sm font-bold text-primary">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-ink">{c.name}</p>
            {c.city && <p className="text-xs text-ink-secondary">{c.city}</p>}
          </div>
        </div>
      </Td>
      <Td>{c.sector}</Td>
      <Td>{c.country}</Td>
      <Td>
        {c.verifiedAt ? (
          <Badge variant="success">
            <CheckCircle2 size={11} className="mr-1 inline-block" />
            Vérifiée
          </Badge>
        ) : (
          <Badge variant="warning">À vérifier</Badge>
        )}
      </Td>
      <Td className="text-right">
        {!c.verifiedAt && (
          <Button size="sm" variant="success" loading={verifying} onClick={onVerify}>
            Vérifier
          </Button>
        )}
      </Td>
    </tr>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-ink-secondary ${className ?? ''}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm text-ink ${className ?? ''}`}>{children}</td>;
}
