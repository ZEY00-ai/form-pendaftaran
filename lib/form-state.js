// State awal untuk useActionState (aman diimpor di client maupun server)
export const initialFormState = {
  success: false,
  message: '',
  errors: {},
  values: { name: '', discord: '', eventId: '', whatsapp: '', note: '' },
};