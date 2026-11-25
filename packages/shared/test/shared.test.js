import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCelular, enlaceWhatsApp, PLANTILLAS } from '../src/whatsapp.js';
import { estadoPedido, pasosPedido } from '../src/estados.js';
import { tallaEnRango, etiquetaRango } from '../src/tallas.js';
import { mensajeError } from '../src/errores.js';

test('normalizarCelular acepta celulares bolivianos de 8 dígitos y con prefijo 591', () => {
  assert.equal(normalizarCelular('71234567'), '59171234567');
  assert.equal(normalizarCelular('+591 6123-4567'), '59161234567');
  assert.equal(normalizarCelular('59171234567'), '59171234567');
});
test('normalizarCelular rechaza números inválidos', () => {
  for (const v of ['', null, undefined, '1234567', '51234567', '712345678', 'abc']) assert.equal(normalizarCelular(v), null, String(v));
});
test('enlaceWhatsApp codifica el mensaje y devuelve null sin número válido', () => {
  const url = enlaceWhatsApp('71234567', 'Hola & gracias');
  assert.equal(url, 'https://wa.me/59171234567?text=Hola%20%26%20gracias');
  assert.equal(enlaceWhatsApp('', 'x'), null);
});
test('las plantillas usan solo el primer nombre y el número de pedido', () => {
  const t = PLANTILLAS.confirmado.texto({ nombre: 'Ana María Pérez', pedido: 15 });
  assert.match(t, /Hola Ana,/); assert.match(t, /N\.º 15/);
  assert.match(PLANTILLAS.rechazado.texto({ nombre: 'Ana', pedido: 3, motivo: 'foto borrosa' }), /foto borrosa/);
  assert.match(PLANTILLAS.en_camino.texto({ nombre: '', pedido: 3, repartidor: 'Moto Rápido' }), /Hola cliente.*Moto Rápido/);
});
test('estadoPedido distingue contra entrega por confirmar', () => {
  assert.equal(estadoPedido({ estado: 'pendiente_pago', pago_contra_entrega: 'efectivo' }).texto, 'Por confirmar');
  assert.equal(estadoPedido({ estado: 'pendiente_pago', pago_contra_entrega: null }).texto, 'Pendiente de pago');
  assert.equal(estadoPedido({ estado: 'pagado' }).texto, 'Confirmado');
});
test('pasosPedido marca el avance del pedido', () => {
  const p = pasosPedido({ estado: 'pagado', pago_contra_entrega: null, metodo_despacho: 'retiro' });
  assert.deepEqual(p.map((x) => x.hecho), [true, true, true, false, false]);
  assert.equal(p.find((x) => x.actual).texto, 'Confirmado');
  const d = pasosPedido({ estado: 'en_despacho', pago_contra_entrega: 'qr', metodo_despacho: 'domicilio' });
  assert.deepEqual(d.map((x) => x.texto), ['Por confirmar', 'Confirmado', 'En despacho', 'Entregado']);
});
test('tallas: límites de las categorías (RF-06)', () => {
  const nino = { talla_min: 20, talla_max: 34 }, juvenil = { talla_min: 35, talla_max: 39 }, adulto = { talla_min: 40, talla_max: null };
  assert.deepEqual([19, 20, 34, 35].map((t) => tallaEnRango(t, nino)), [false, true, true, false]);
  assert.deepEqual([34, 35, 39, 40].map((t) => tallaEnRango(t, juvenil)), [false, true, true, false]);
  assert.deepEqual([39, 40, 55].map((t) => tallaEnRango(t, adulto)), [false, true, true]);
  assert.equal(etiquetaRango(adulto), '40 en adelante');
});
test('mensajeError traduce errores y deja pasar los mensajes de negocio', () => {
  assert.equal(mensajeError({ message: 'Solo hay 2 unidad(es)', code: '23514' }), 'Solo hay 2 unidad(es)');
  assert.equal(mensajeError({ message: 'x', code: '42501' }), 'No tienes permiso para realizar esta acción.');
  assert.match(mensajeError({ message: 'Failed to fetch' }), /Sin conexión/);
});

// ---- Sprint 3 ----------------------------------------------------------------------------------------------
import { codigoModelo, coincideBusqueda, calcularTotales, agregarLinea, cambiarCantidadLinea, resultadoArqueo, hoyBolivia, crearMonitorConexion } from '../src/caja.js';

test('POS: búsqueda por código o nombre, sin tildes ni mayúsculas (RF-15)', () => {
  const m = { id: 12, marca: 'Volta', nombre: 'Runner Pro', color: 'Negro' };
  assert.equal(codigoModelo(12), 'M0012');
  for (const q of ['M0012', 'm0012', '12', 'runner', 'RUNNER pro', 'volta negro', '']) assert.equal(coincideBusqueda(m, q), true, q);
  for (const q of ['M0013', '13', 'blanco', 'runner rojo']) assert.equal(coincideBusqueda(m, q), false, q);
  assert.equal(coincideBusqueda({ id: 1, marca: 'Aurora', nombre: 'Niño Ágil', color: 'Azul' }, 'nino agil'), true);
});
test('POS: totales con descuento de fidelidad redondeados como la BD', () => {
  assert.deepEqual(calcularTotales([{ precio: 50, cantidad: 1 }], 5), { subtotal: 50, descuento: 2.5, total: 47.5, unidades: 1 });
  assert.deepEqual(calcularTotales([{ precio: 449.9, cantidad: 3 }], 0), { subtotal: 1349.7, descuento: 0, total: 1349.7, unidades: 3 });
  assert.equal(calcularTotales([{ precio: 33.33, cantidad: 1 }], 5).descuento, 1.67);   // 1,6665 → 1,67
  assert.equal(calcularTotales([], 5).total, 0);
});
test('POS: el carrito nunca supera el stock y quita la línea al llegar a 0', () => {
  const base = { modeloId: 1, talla: 42, precio: 100, stock: 2 };
  let c = agregarLinea([], base);
  c = agregarLinea(c, base); c = agregarLinea(c, base);
  assert.equal(c.length, 1); assert.equal(c[0].cantidad, 2);
  assert.deepEqual(agregarLinea([], { ...base, stock: 0 }), []);
  assert.equal(cambiarCantidadLinea(c, 1, 42, 9)[0].cantidad, 2);
  assert.deepEqual(cambiarCantidadLinea(c, 1, 42, 0), []);
});
test('arqueo: cuadra, sobra o falta', () => {
  assert.equal(resultadoArqueo(100, 100).texto, 'La caja cuadra');
  assert.deepEqual([resultadoArqueo(105.5, 100).dif, resultadoArqueo(95, 100).dif], [5.5, -5]);
  assert.equal(resultadoArqueo(95, 100).texto, 'Falta dinero');
  assert.equal(resultadoArqueo(0.3, 0.1 + 0.2).texto, 'La caja cuadra');
});
test('hoyBolivia usa la hora de La Paz (UTC−4)', () => {
  assert.equal(hoyBolivia(new Date('2026-11-25T02:30:00Z')), '2026-11-24');
  assert.equal(hoyBolivia(new Date('2026-11-25T04:00:00Z')), '2026-11-25');
});
test('monitor de conexión: congela al primer fallo, avisa solo en cambios y reanuda al volver (RNF-13)', async () => {
  let responde = true; const cambios = [];
  const m = crearMonitorConexion({ ping: async () => { if (!responde) throw new Error('sin red'); }, alCambiar: (v) => cambios.push(v), setTimer: () => 0, clearTimer: () => {} });
  await m.revisar(); assert.deepEqual(cambios, []);            // sigue en línea: no avisa
  responde = false; await m.revisar(); await m.revisar();
  assert.deepEqual(cambios, [false]); assert.equal(m.enLinea, false);
  responde = true; await m.revisar();
  assert.deepEqual(cambios, [false, true]);
  m.reportar(false); m.reportar(false); assert.deepEqual(cambios, [false, true, false]);   // evento "offline" del navegador
});
