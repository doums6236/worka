'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { companiesApi, jobsApi, domainsApi } from '@/lib/endpoints';

export default function DashboardPage() {
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => companiesApi.list() });
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: () => domainsApi.list() });

  const jobsTotal = jobs?.length ?? 0;
  const jobsPending = jobs?.filter((j) => j.status === 'pending').length ?? 0;
  const jobsPublished = jobs?.filter((j) => j.status === 'published').length ?? 0;
  const totalApplications = jobs?.reduce((s, j) => s + j.applicationCount, 0) ?? 0;

  const companiesTotal = companies?.length ?? 0;
  const companiesPending = companies?.filter((c) => !c.verifiedAt).length ?? 0;
  const companiesVerified = companies?.filter((c) => !!c.verifiedAt).length ?? 0;

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ink">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Modération et indicateurs clés de la plateforme.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Offres publiées"
          value={jobsPublished}
          icon={<Briefcase size={18} />}
          tint="primary"
        />
        <StatCard
          label="En attente"
          value={jobsPending}
          icon={<Clock size={18} />}
          tint="warning"
          urgent={jobsPending > 0}
        />
        <StatCard
          label="Entreprises"
          value={companiesTotal}
          icon={<Building2 size={18} />}
          tint="neutral"
          hint={`${companiesVerified} vérifiées`}
        />
        <StatCard
          label="Candidatures"
          value={totalApplications}
          icon={<TrendingUp size={18} />}
          tint="success"
        />
      </div>

      {/* Action queues */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <QueueCard
          title="Offres à modérer"
          count={jobsPending}
          empty="Tout est modéré."
          href="/jobs?status=pending"
          accent="warning"
          icon={<AlertCircle size={20} />}
        />
        <QueueCard
          title="Entreprises à vérifier"
          count={companiesPending}
          empty="Toutes les entreprises sont vérifiées."
          href="/companies?status=pending"
          accent="primary"
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      {/* Catalog summary */}
      <Card className="mt-8 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink">Catalogue</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              {domains?.length ?? 0} domaines actifs
            </p>
          </div>
          <Link href="/domains" className="text-sm font-bold text-primary hover:underline">
            Gérer →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {domains?.slice(0, 10).map((d) => (
            <span
              key={d.id}
              className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-secondary"
            >
              {d.icon ?? '•'} {d.nameFr}
            </span>
          ))}
          {(domains?.length ?? 0) > 10 && (
            <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink-secondary">
              +{(domains?.length ?? 0) - 10}
            </span>
          )}
        </div>
      </Card>

      {/* Latest jobs */}
      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-base font-extrabold text-ink">Dernières offres soumises</h2>
          <Link href="/jobs" className="text-sm font-bold text-primary hover:underline">
            Tout voir →
          </Link>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted">
              <tr>
                <Th>Titre</Th>
                <Th>Entreprise</Th>
                <Th>Statut</Th>
                <Th className="text-right">Candidatures</Th>
              </tr>
            </thead>
            <tbody>
              {jobs?.slice(0, 6).map((j) => (
                <tr key={j.id} className="border-t border-line">
                  <Td>
                    <Link href={`/jobs/${j.id}`} className="font-bold hover:text-primary">
                      {j.title}
                    </Link>
                    <p className="text-xs text-ink-secondary">{j.domain.nameFr}</p>
                  </Td>
                  <Td>
                    {j.company.name}
                    {j.company.verifiedAt && (
                      <CheckCircle2
                        size={14}
                        className="ml-1 inline-block text-success"
                      />
                    )}
                  </Td>
                  <Td>
                    <JobStatusBadge status={j.status} />
                  </Td>
                  <Td className="text-right font-bold text-ink">{j.applicationCount}</Td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-secondary">
                    Aucune offre pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
  hint,
  urgent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: 'primary' | 'warning' | 'success' | 'neutral';
  hint?: string;
  urgent?: boolean;
}) {
  const tintBg = {
    primary: 'bg-surface-bgLight text-primary',
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-success',
    neutral: 'bg-surface-muted text-ink-secondary',
  }[tint];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tintBg}`}>
          {icon}
        </div>
        {urgent && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
            Action requise
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-secondary">
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </Card>
  );
}

function QueueCard({
  title,
  count,
  empty,
  href,
  accent,
  icon,
}: {
  title: string;
  count: number;
  empty: string;
  href: string;
  accent: 'primary' | 'warning';
  icon: React.ReactNode;
}) {
  const isEmpty = count === 0;
  const bg = isEmpty
    ? 'border-emerald-200 bg-emerald-50'
    : accent === 'warning'
      ? 'border-amber-300 bg-amber-50'
      : 'border-primary/40 bg-surface-bgLight';
  const iconCol = isEmpty ? 'text-success' : accent === 'warning' ? 'text-amber-600' : 'text-primary';
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl border p-5 transition-colors ${bg} hover:scale-[1.005]`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white ${iconCol}`}>
        {isEmpty ? <CheckCircle2 size={22} /> : icon}
      </div>
      <div className="flex-1">
        <h3 className="text-base font-extrabold text-ink">{title}</h3>
        <p className="text-sm text-ink-secondary">{isEmpty ? empty : `${count} en attente`}</p>
      </div>
      <span className="text-xl font-extrabold text-ink">{isEmpty ? '✓' : count}</span>
    </Link>
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
  return <td className={`px-4 py-3 text-sm text-ink ${className ?? ''}`}>{children}</td>;
}
