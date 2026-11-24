import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [iniciado, setIniciado] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIniciado(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // El rol se lee de la BD (tabla usuarios); la interfaz solo lo usa para mostrar u ocultar módulos.
  // La seguridad real la imponen las políticas RLS.
  useEffect(() => {
    if (!session) {
      setPerfil(null);
      return undefined;
    }
    let cancelado = false;
    setCargandoPerfil(true);
    supabase
      .from('usuarios')
      .select('id,nombre,correo,activo,roles(nombre)')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        setPerfil(data ? { ...data, rol: data.activo ? data.roles?.nombre : null } : null);
        setCargandoPerfil(false);
      });
    return () => {
      cancelado = true;
    };
  }, [session?.user?.id]);

  const value = useMemo(
    () => ({
      session,
      perfil,
      rol: perfil?.rol ?? null,
      cargando: !iniciado || cargandoPerfil,
      ingresar: ({ correo, clave }) => supabase.auth.signInWithPassword({ email: correo, password: clave }),
      salir: () => supabase.auth.signOut(),
    }),
    [session, perfil, iniciado, cargandoPerfil]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
