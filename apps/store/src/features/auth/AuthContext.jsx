import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      cargando,
      // El rol NO se envía: el trigger de la BD siempre crea cuentas con rol "cliente".
      registrar: ({ correo, clave, nombre, celular, ci }) =>
        supabase.auth.signUp({ email: correo, password: clave, options: { data: { nombre, celular, ci } } }),
      ingresar: ({ correo, clave }) => supabase.auth.signInWithPassword({ email: correo, password: clave }),
      salir: () => supabase.auth.signOut(),
      recuperar: (correo) =>
        supabase.auth.resetPasswordForEmail(correo, { redirectTo: `${window.location.origin}/restablecer` }),
      actualizarClave: (clave) => supabase.auth.updateUser({ password: clave }),
    }),
    [session, cargando]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
