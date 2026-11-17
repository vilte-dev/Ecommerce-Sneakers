import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { cargarCarritoRemoto, guardarCarritoRemoto } from './api.js';

const CLAVE = 'sneakers.carrito.v1';
const CartContext = createContext(null);

function leerLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
const mismo = (a, b) => a.modeloId === b.modeloId && a.talla === b.talla;

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(leerLocal);
  const sincronizado = useRef(false);

  // Al iniciar sesión: fusiona el carrito local con el guardado en la BD.
  useEffect(() => {
    if (!user) {
      sincronizado.current = false;
      return undefined;
    }
    let cancelado = false;
    cargarCarritoRemoto()
      .then((remotos) => {
        if (cancelado) return;
        setItems((local) => {
          const fusion = [...local];
          for (const r of remotos) {
            const i = fusion.findIndex((x) => mismo(x, r));
            if (i === -1) fusion.push(r);
            else fusion[i] = { ...fusion[i], cantidad: Math.min(Math.max(fusion[i].cantidad, r.cantidad), fusion[i].stockMax) };
          }
          return fusion;
        });
        sincronizado.current = true;
      })
      .catch((e) => console.error('No se pudo cargar el carrito guardado', e));
    return () => {
      cancelado = true;
    };
  }, [user?.id]);

  // Persistencia: siempre en el navegador; con sesión, también en la BD.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible: el carrito vive solo en memoria */
    }
    if (!user || !sincronizado.current) return undefined;
    const t = setTimeout(() => guardarCarritoRemoto(items).catch((e) => console.error('No se pudo guardar el carrito', e)), 600);
    return () => clearTimeout(t);
  }, [items, user?.id]);

  // Se calcula contra una referencia al estado actual para poder devolver el resultado de inmediato.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const agregar = useCallback((nuevo, cantidad = 1) => {
    const prev = itemsRef.current;
    const i = prev.findIndex((x) => mismo(x, nuevo));
    const deseada = (i === -1 ? 0 : prev[i].cantidad) + cantidad;
    const final = Math.min(deseada, nuevo.stockMax);
    const siguiente =
      i === -1
        ? [...prev, { ...nuevo, cantidad: final }]
        : prev.map((x, k) => (k === i ? { ...x, cantidad: final, stockMax: nuevo.stockMax } : x));
    itemsRef.current = siguiente;
    setItems(siguiente);
    return final < deseada
      ? { ok: false, mensaje: `Solo hay ${nuevo.stockMax} unidad(es) disponibles de esta talla.` }
      : { ok: true };
  }, []);

  const cambiarCantidad = useCallback((modeloId, talla, cantidad) => {
    setItems((prev) =>
      prev.map((x) => (mismo(x, { modeloId, talla }) ? { ...x, cantidad: Math.max(1, Math.min(cantidad, x.stockMax)) } : x))
    );
  }, []);

  const quitar = useCallback((modeloId, talla) => setItems((prev) => prev.filter((x) => !mismo(x, { modeloId, talla }))), []);
  const vaciar = useCallback(() => setItems([]), []);

  /** Actualiza el stock real y descarta lo que ya no existe. `stock` = filas de catalogo_tallas. */
  const ajustarStock = useCallback((stock) => {
    setItems((prev) =>
      prev
        .map((x) => {
          const max = stock.find((s) => s.modelo_id === x.modeloId && s.talla === x.talla)?.cantidad ?? 0;
          return { ...x, stockMax: max, cantidad: Math.min(x.cantidad, max) };
        })
        .filter((x) => x.cantidad > 0)
    );
  }, []);

  const value = useMemo(
    () => ({
      items,
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      ajustarStock,
      cantidadTotal: items.reduce((n, i) => n + i.cantidad, 0),
      total: items.reduce((n, i) => n + i.cantidad * i.precio, 0),
    }),
    [items, agregar, cambiarCantidad, quitar, vaciar, ajustarStock]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
