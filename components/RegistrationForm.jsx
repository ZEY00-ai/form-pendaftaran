'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerAction } from '@/app/actions';
import { initialFormState } from '@/lib/form-state';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Mengirim...' : 'Daftar'}
    </button>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-200">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none';

export default function RegistrationForm({ options }) {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const { values, errors } = state;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label="Nama lengkap" error={errors.name}>
        <input
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={values.name}
          placeholder="Contoh: Daffa Pratama"
          className={inputClass}
        />
      </Field>

      <Field label="Username Discord" hint="Tanpa tanda @, contoh: daffa_01" error={errors.discord}>
        <input
          name="discord"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={values.discord}
          placeholder="username"
          className={inputClass}
        />
      </Field>

      <Field label="Pilih event" error={errors.eventId}>
        <select name="eventId" defaultValue={values.eventId} className={inputClass}>
          <option value="">-- Pilih event --</option>
          {options.map((o) => (
            <option key={o.id} value={o.id} disabled={o.full}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Nomor WhatsApp (opsional)"
        hint="Tidak ditampilkan di Discord, hanya disimpan di spreadsheet panitia."
        error={errors.whatsapp}
      >
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={values.whatsapp}
          placeholder="081234567890"
          className={inputClass}
        />
      </Field>

      <Field label="Catatan (opsional)" hint="Maksimal 300 karakter." error={errors.note}>
        <textarea
          name="note"
          rows={3}
          maxLength={300}
          defaultValue={values.note}
          className={inputClass}
        />
      </Field>

      <SubmitButton />

      {state.message && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? 'border-green-800 bg-green-950/50 text-green-400'
              : 'border-red-900 bg-red-950/50 text-red-400'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}