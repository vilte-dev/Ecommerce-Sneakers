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
