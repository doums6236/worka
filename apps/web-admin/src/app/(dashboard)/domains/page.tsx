'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, EmptyState } from '@/components/ui';
import { domainsApi, type Domain } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';

export default function DomainsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Domain | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.list(),
  });

  const create = useMutation({
    mutationFn: domainsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      setCreating(false);
      setFormError(null);
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : 'Erreur'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: string; nameFr?: string; nameEn?: string; icon?: string }) =>
      domainsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      setEditing(null);
      setFormError(null);
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : 'Erreur'),
  });

  const remove = useMutation({
    mutationFn: domainsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      setDeleteId(null);
    },
  });

  function onSubmitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const nameFr = String(fd.get('nameFr') ?? '').trim();
    const nameEn = String(fd.get('nameEn') ?? '').trim() || undefined;
    const icon = String(fd.get('icon') ?? '').trim() || undefined;
    if (!nameFr) {
      setFormError('Nom français requis');
      return;
    }
    create.mutate({ nameFr, nameEn, icon });
  }

  function onSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    update.mutate({
      id: editing.id,
      nameFr: String(fd.get('nameFr') ?? '').trim() || undefined,
      nameEn: String(fd.get('nameEn') ?? '').trim() || undefined,
      icon: String(fd.get('icon') ?? '').trim() || undefined,
    });
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Domaines</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Catégories utilisées par les candidats pour choisir leurs centres d&apos;intérêt.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} iconLeft={<Plus size={16} />}>
          Nouveau domaine
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tag size={28} />}
            title="Aucun domaine"
            hint="Crée des domaines pour que les candidats puissent choisir leurs intérêts."
            cta={
              <Button onClick={() => setCreating(true)} iconLeft={<Plus size={16} />}>
                Créer le premier domaine
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-bgLight text-2xl">
                {d.icon ?? '•'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{d.nameFr}</p>
                {d.nameEn && <p className="truncate text-xs text-ink-secondary">{d.nameEn}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditing(d);
                    setFormError(null);
                  }}
                  className="rounded-lg p-2 text-ink-secondary hover:bg-surface-muted hover:text-primary"
                  aria-label="Modifier"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteId(d.id)}
                  className="rounded-lg p-2 text-ink-secondary hover:bg-red-50 hover:text-danger"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Nouveau domaine">
        <form onSubmit={onSubmitCreate} className="space-y-4">
          <Input label="Nom (français)" name="nameFr" placeholder="Informatique" autoFocus required />
          <Input label="Nom (anglais)" name="nameEn" placeholder="IT" />
          <Input label="Icône (emoji)" name="icon" placeholder="💻" maxLength={4} />
          {formError && <p className="text-sm font-semibold text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={create.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier le domaine">
        {editing && (
          <form onSubmit={onSubmitEdit} className="space-y-4">
            <Input
              label="Nom (français)"
              name="nameFr"
              defaultValue={editing.nameFr}
              autoFocus
              required
            />
            <Input label="Nom (anglais)" name="nameEn" defaultValue={editing.nameEn ?? ''} />
            <Input label="Icône (emoji)" name="icon" defaultValue={editing.icon ?? ''} maxLength={4} />
            {formError && <p className="text-sm font-semibold text-danger">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={update.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer ce domaine ?">
        <p className="text-sm text-ink-secondary">
          Les candidats qui l&apos;avaient sélectionné perdront cette préférence. Cette action est
          irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => deleteId && remove.mutate(deleteId)}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
