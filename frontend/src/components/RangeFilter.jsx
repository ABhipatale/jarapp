import { t } from '../i18n';
import { rangeFor, today } from '../lib/format';

const PRESETS = [
  { key: 'today', label: t('common.today') },
  { key: 'yesterday', label: t('common.yesterday') },
  { key: 'week', label: t('range.week') },
  { key: 'month', label: t('range.month') },
  { key: 'custom', label: t('range.custom') },
];

/** Today / Yesterday / This Week / This Month / Custom range. value = { preset, from, to } */
export default function RangeFilter({ value, onChange }) {
  const pick = (preset) => {
    if (preset === 'custom') onChange({ ...value, preset });
    else onChange({ preset, ...rangeFor(preset) });
  };

  return (
    <div className="no-print">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {PRESETS.map((p) => (
          <button key={p.key} className={`chip ${value.preset === p.key ? 'chip-active' : ''}`} onClick={() => pick(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="date" className="input" value={value.from} max={today()} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <input type="date" className="input" value={value.to} max={today()} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </div>
      )}
    </div>
  );
}

export function initialRange(preset = 'today') {
  return { preset, ...rangeFor(preset) };
}
