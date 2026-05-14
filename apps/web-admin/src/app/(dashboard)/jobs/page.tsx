'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, MapPin, Banknote, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Button, Card, Badge, EmptyState, Modal } from '@/components/ui';
import { jobsApi, type Job, type JobStatus } from '@/lib/endpoints';

type Filter = 'all' | JobStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'À modérer' },
  { key: 'published', label: 'Publiées' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'closed', label: 'Fermées' },
];

export default function JobsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState<Job | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
  });

  const publish = useMutation({
    mutationFn: (id: string) => jobsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => jobsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      setRejecting(null);
    },
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== 'all') list = list.filter((j) => j.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.name.toLowerCase().includes(q) ||
          j.domain.nameFr.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const list = data ?? [];
    const c: Record<Filter, number> = {
      all: list.length,
      pending: 0,
      published: 0,
      draft: 0,
      closed: 0,
      expired: 0,
    };
    list.forEach((j) => {
      c[j.status as Filter] = (c[j.status as Filter] ?? 0) + 1;
    });
    return c;
  }, [data]);

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink">Offres d&apos;emploi</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Modère les offres soumises avant publication. Une offre rejetée repasse en brouillon.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-ink-secondary hover:bg-surface-bgLight hover:text-primary'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-80">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titre, entreprise, domaine…"
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
            icon={<Briefcase size={28} />}
            title={
              filter === 'pending'
                ? 'Aucune offre à modérer'
                : search
                  ? 'Aucun résultat'
                  : 'Pas d’offre dans cette catégorie'
            }
            hint={
              filter === 'pending'
                ? 'Tu peux profiter d’une pause bien méritée.'
                : "Affine les filtres ou la recherche."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((j) => (
            <JobCard
              key={j.id}
              j={j}
              onPublish={() => publish.mutate(j.id)}
              publishing={publish.isPending && publish.variables === j.id}
              onReject={() => setRejecting(j)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Rejeter cette offre ?"
      >
        {rejecting && (
          <>
            <p className="text-sm text-ink-secondary">
              <span className="font-bold text-ink">{rejecting.title}</span> chez{' '}
              <span className="font-bold text-ink">{rejecting.company.name}</span> repassera en
              brouillon et le recruteur pourra la modifier avant de la soumettre à nouveau.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={reject.isPending}
                onClick={() => reject.mutate(rejecting.id)}
              >
                Rejeter
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function JobCard({
  j,
  onPublish,
  publishing,
  onReject,
}: {
  j: Job;
  onPublish: () => void;
  publishing: boolean;
  onReject: () => void;
}) {
  const initials = j.company.name.slice(0, 2).toUpperCase();
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-bgLight text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-extrabold text-ink">{j.title}</h3>
            <p className="truncate text-xs text-ink-secondary">
              {j.company.name}
              {j.company.verifiedAt && (
                <CheckCircle2 size={11} className="ml-1 inline-block text-success" />
              )}
            </p>
          </div>
        </div>
        <JobStatusBadge status={j.status} />
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-ink-secondary">{j.description}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-secondary">
        <Chip>
          <MapPin size={11} />
          {j.city ? `${j.city}, ${j.country}` : j.country}
        </Chip>
        <Chip>{j.domain.nameFr}</Chip>
        <Chip>{j.type.toUpperCase()}</Chip>
        {j.salaryMin || j.salaryMax ? (
          <Chip>
            <Banknote size={11} />
            {formatSalary(j.salaryMin, j.salaryMax, j.currency)}
          </Chip>
        ) : null}
      </div>

      {j.status === 'pending' && (
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <Button
            variant="success"
            size="sm"
            className="flex-1"
            loading={publishing}
            onClick={onPublish}
            iconLeft={<CheckCircle2 size={14} />}
          >
            Publier
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onReject}
            iconLeft={<XCircle size={14} />}
          >
            Rejeter
          </Button>
        </div>
      )}

      {j.status === 'published' && j.applicationCount > 0 && (
        <div className="mt-4 border-t border-line pt-3 text-xs text-ink-secondary">
          <span className="font-bold text-ink">{j.applicationCount}</span> candidatures · {j.viewCount} vues
        </div>
      )}
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold">
      {children}
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: 'primary' | 'warning' | 'success' | 'neutral' | 'danger'; label: string }> = {
    draft: { v: 'neutral', label: 'Brouillon' },
    pending: { v: 'warning', label: 'En attente' },
    published: { v: 'success', label: 'Publiée' },
    closed: { v: 'neutral', label: 'Fermée' },
    expired: { v: 'danger', label: 'Expirée' },
  };
  const m = map[status] ?? map.draft;
  return <Badge variant={m.v}>{m.label}</Badge>;
}

function formatSalary(min: number | null | undefined, max: number | null | undefined, cur: string) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)}–${fmt(max)} ${cur}`;
  if (min) return `Dès ${fmt(min)} ${cur}`;
  if (max) return `Jusqu'à ${fmt(max)} ${cur}`;
  return '—';
}
