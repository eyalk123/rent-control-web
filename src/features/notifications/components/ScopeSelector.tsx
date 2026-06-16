import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProperties } from '@/features/properties/queries';
import { useRenters } from '@/features/renters/queries';

type ScopeKind = 'all' | 'owners' | 'properties' | 'renters';

export interface ScopeValue {
  scope_property_ids: number[];
  scope_property_owners: string[];
  scope_renter_ids: number[];
}

interface Props {
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
}

const EMPTY: ScopeValue = {
  scope_property_ids: [],
  scope_property_owners: [],
  scope_renter_ids: [],
};

function initialKind(v: ScopeValue): ScopeKind {
  if (v.scope_property_owners.length) return 'owners';
  if (v.scope_property_ids.length) return 'properties';
  if (v.scope_renter_ids.length) return 'renters';
  return 'all';
}

/** Positive-only scope: pick one dimension (all / owners / properties / renters)
 * then multi-select within it. The backend supports a union across dimensions;
 * this UI keeps it to one for clarity. */
export function ScopeSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ScopeKind>(() => initialKind(value));
  const [query, setQuery] = useState('');
  const { data: properties = [] } = useProperties();
  const { data: renters = [] } = useRenters();

  const owners = useMemo(
    () => [...new Set(properties.map((p) => p.property_owner).filter((o): o is string => !!o))].sort(),
    [properties],
  );

  const q = query.trim().toLowerCase();
  const filteredOwners = useMemo(
    () => (q ? owners.filter((o) => o.toLowerCase().includes(q)) : owners),
    [owners, q],
  );
  const filteredProperties = useMemo(
    () => (q ? properties.filter((p) => `${p.address}, ${p.city}`.toLowerCase().includes(q)) : properties),
    [properties, q],
  );
  const filteredRenters = useMemo(
    () => (q ? renters.filter((r) => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q)) : renters),
    [renters, q],
  );

  const changeKind = (next: ScopeKind) => {
    setKind(next);
    setQuery('');
    onChange({ ...EMPTY }); // switching dimension clears the previous selection
  };

  const toggle = <T extends string | number>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const counts: Record<Exclude<ScopeKind, 'all'>, number> = {
    owners: filteredOwners.length,
    properties: filteredProperties.length,
    renters: filteredRenters.length,
  };

  const KIND_OPTIONS: { key: ScopeKind; label: string }[] = [
    { key: 'all', label: t('notifications.scopeAll') },
    { key: 'owners', label: t('notifications.scopeOwners') },
    { key: 'properties', label: t('notifications.scopeProperties') },
    { key: 'renters', label: t('notifications.scopeRenters') },
  ];

  return (
    <div>
      <p className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {t('notifications.appliesTo')}
      </p>
      <div className="flex flex-col gap-1.5">
        {KIND_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
            <input
              type="radio"
              name="scope-kind"
              checked={kind === opt.key}
              onChange={() => changeKind(opt.key)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {kind !== 'all' && (
        <>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notifications.scopeSearch')}
          className="mt-2 h-9 w-full rounded-[9px] px-3 text-sm outline-none"
          style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
        />
        <div
          className="mt-1.5 max-h-44 overflow-y-auto rounded-[9px] p-2 flex flex-col gap-1"
          style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)' }}
        >
          {kind === 'owners' && filteredOwners.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={value.scope_property_owners.includes(o)}
                onChange={() => onChange({ ...EMPTY, scope_property_owners: toggle(value.scope_property_owners, o) })}
              />
              {o}
            </label>
          ))}
          {kind === 'owners' && owners.length === 0 && (
            <p className="text-[12px] px-1 py-2" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.noOwners')}</p>
          )}

          {kind === 'properties' && filteredProperties.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={value.scope_property_ids.includes(p.id)}
                onChange={() => onChange({ ...EMPTY, scope_property_ids: toggle(value.scope_property_ids, p.id) })}
              />
              {p.address}, {p.city}
            </label>
          ))}

          {kind === 'renters' && filteredRenters.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={value.scope_renter_ids.includes(r.id)}
                onChange={() => onChange({ ...EMPTY, scope_renter_ids: toggle(value.scope_renter_ids, r.id) })}
              />
              {r.first_name} {r.last_name}
            </label>
          ))}

          {q && counts[kind] === 0 && (
            <p className="text-[12px] px-1 py-2" style={{ color: 'var(--color-text-secondary)' }}>{t('notifications.scopeNoMatches')}</p>
          )}
        </div>
        </>
      )}
    </div>
  );
}
