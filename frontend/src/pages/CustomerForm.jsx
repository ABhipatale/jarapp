import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { Field, Loader, PageHeader, Segmented } from '../components/ui';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';

export default function CustomerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useUi();
  const [form, setForm] = useState({ name: '', mobile: '', address: '', status: 'active' });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/customers/${id}`)
      .then(({ data }) => setForm({ name: data.data.name, mobile: data.data.mobile, address: data.data.address || '', status: data.data.status }))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t('cust.enterName'));
    const digits = form.mobile.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) return setError(t('cust.enterMobile'));
    setBusy(true);
    setError('');
    try {
      const { data } = editing ? await api.put(`/customers/${id}`, form) : await api.post('/customers', form);
      toast(data.message || t('cust.saved'));
      navigate(`/customers/${data.data.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <form onSubmit={submit} className="space-y-4">
      <PageHeader title={editing ? t('cust.editTitle') : t('cust.add')} back />
      <div className="card space-y-4">
        <Field label={t('cust.name')}>
          <input className="input" value={form.name} onChange={set('name')} autoFocus={!editing} maxLength={120} />
        </Field>
        <Field label={t('cust.mobile')} hint={t('cust.mobileHint')}>
          <input className="input" type="tel" inputMode="numeric" value={form.mobile} onChange={set('mobile')} maxLength={14} />
        </Field>
        <Field label={t('cust.address')}>
          <textarea className="input" rows={2} value={form.address} onChange={set('address')} maxLength={500} />
        </Field>
        {editing && (
          <Field group label={t('cust.status')}>
            <Segmented
              size="sm"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={[
                { value: 'active', label: t('cust.active'), activeClass: 'bg-emerald-600 text-white ring-emerald-600' },
                { value: 'inactive', label: t('cust.inactive'), activeClass: 'bg-slate-600 text-white ring-slate-600' },
              ]}
            />
          </Field>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full py-4 text-lg" disabled={busy}>
        {busy ? t('common.saving') : editing ? t('cust.saveChanges') : t('cust.add')}
      </button>
    </form>
  );
}
