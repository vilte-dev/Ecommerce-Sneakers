/** Traduce errores de Supabase/Postgres a mensajes claros en español (RNF-10). */
export function mensajeError(error) {
  const msg = String(error?.message ?? '');
  const code = String(error?.code ?? '');
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo.';
  if (/Database error saving new user/i.test(msg)) return 'No se pudo crear la cuenta. Revisa que el celular no esté usado por otra cuenta.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.';
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  if (code === '23514') return msg;                       // mensajes de talla/stock ya vienen en español
  if (code === '23505') return 'Ya existe un registro con esos datos.';
  if (code === '42501' || /row-level security/i.test(msg)) return 'No tienes permiso para realizar esta acción.';
  return 'Ocurrió un error. Inténtalo de nuevo.';
}
