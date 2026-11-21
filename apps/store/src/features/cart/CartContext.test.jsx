
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  act,
  cleanup,
  renderHook
} from '@testing-library/react';

import { CartProvider, useCart } from './CartContext.jsx';

// Aislamos autenticación y persistencia remota.
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('./api.js', () => ({
  cargarCarritoRemoto: vi.fn(),
  guardarCarritoRemoto: vi.fn(),
}));

// Producto de prueba basado en la estructura del carrito.
const producto = (overrides = {}) => ({
  modeloId: 'modelo-001',
  talla: '42',
  nombre: 'Sneaker Test',
  precio: 350,
  stockMax: 5,
  ...overrides,
});

const wrapper = ({ children }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext - Carrito de compras', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('agregar_ProductoNuevo_SeIncluyeEnElCarrito', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    // Act
    let respuesta;

    act(() => {
      respuesta = result.current.agregar(producto(), 2);
    });

    // Assert
    expect(respuesta).toEqual({ ok: true });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(2);
    expect(result.current.cantidadTotal).toBe(2);
  });

  it('agregar_MismaTalla_IncrementaLaCantidadDelMismoItem', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    // Act
    act(() => {
      result.current.agregar(producto(), 1);
      result.current.agregar(producto(), 2);
    });

    // Assert
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it('agregar_CantidadSuperaStock_LimitaCantidadYDevuelveAdvertencia', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    // Act
    let respuesta;

    act(() => {
      respuesta = result.current.agregar(
        producto({ stockMax: 3 }),
        5
      );
    });

    // Assert
    expect(result.current.items[0].cantidad).toBe(3);
    expect(respuesta.ok).toBe(false);
    expect(respuesta.mensaje).toContain('Solo hay 3');
  });

  it('cambiarCantidad_CantidadMayorAlStock_RespetaElMaximoDisponible', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 2);
    });

    // Act
    act(() => {
      result.current.cambiarCantidad(
        'modelo-001',
        '42',
        9
      );
    });

    // Assert
    expect(result.current.items[0].cantidad).toBe(5);
  });

  it('cambiarCantidad_CantidadMenorAUno_MantieneUnaUnidad', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 2);
    });

    // Act
    act(() => {
      result.current.cambiarCantidad(
        'modelo-001',
        '42',
        0
      );
    });

    // Assert
    expect(result.current.items[0].cantidad).toBe(1);
  });

  it('quitar_ItemExistente_EliminaSoloEseModeloYTalla', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 1);
      result.current.agregar(
        producto({ talla: '43' }),
        1
      );
    });

    // Act
    act(() => {
      result.current.quitar('modelo-001', '42');
    });

    // Assert
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].talla).toBe('43');
  });

  it('vaciar_CarritoConProductos_DejaElCarritoVacio', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 2);
    });

    // Act
    act(() => {
      result.current.vaciar();
    });

    // Assert
    expect(result.current.items).toEqual([]);
    expect(result.current.cantidadTotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('total_DosUnidades_CalculaPrecioPorCantidad', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    // Act
    act(() => {
      result.current.agregar(
        producto({ precio: 350 }),
        2
      );
    });

    // Assert
    expect(result.current.total).toBe(700);
  });

  it('ajustarStock_StockLlegaACero_EliminaElProductoDelCarrito', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 2);
    });

    // Act
    act(() => {
      result.current.ajustarStock([]);
    });

    // Assert
    expect(result.current.items).toEqual([]);
    expect(result.current.cantidadTotal).toBe(0);
  });

  it('ajustarStock_StockDisminuye_ReduceCantidadAlNuevoMaximo', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    act(() => {
      result.current.agregar(producto(), 4);
    });

    // Act
    act(() => {
      result.current.ajustarStock([
        {
          modelo_id: 'modelo-001',
          talla: '42',
          cantidad: 2
        }
      ]);
    });

    // Assert
    expect(result.current.items[0].stockMax).toBe(2);
    expect(result.current.items[0].cantidad).toBe(2);
  });

  it('persistencia_CarritoCambia_GuardaDatosEnLocalStorage', () => {
    // Arrange
    const { result } = renderHook(
      () => useCart(),
      { wrapper }
    );

    // Act
    act(() => {
      result.current.agregar(producto(), 1);
    });

    // Assert
    const guardado = JSON.parse(
      localStorage.getItem('sneakers.carrito.v1')
    );

    expect(guardado).toHaveLength(1);
    expect(guardado[0].modeloId).toBe('modelo-001');
  });

});
