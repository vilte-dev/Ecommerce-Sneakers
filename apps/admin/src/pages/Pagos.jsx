import { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { mensajeError } from '@sneakers/shared';
import { supabase } from '../lib/supabase.js';

// HU-09 · El Administrador (o el Dueño) configura las cuentas bancarias, el QR de pago y el costo de envío.
export default function Pagos() {
  const [cuentas, setCuentas] = useState(null);
  const [qr, setQr] = useState('');
  const [envio, setEnvio] = useState('0');
  const [f, setF] = useState({ banco: '', titular: '', numero: '', tipo: 'Caja de ahorro' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  async function cargar() {
    const [c, p] = await Promise.all([
      supabase.from('cuentas_pago').select('*').order('id'),
      supabase.from('parametros').select('clave,valor').in('clave', ['qr_pago_url', 'costo_envio']),
    ]);
    if (c.error || p.error) return setError(mensajeError(c.error ?? p.error));
    setCuentas(c.data);
    const m = Object.fromEntries(p.data.map((r) => [r.clave, r.valor]));
    setQr(m.qr_pago_url ?? '');
    setEnvio(m.costo_envio ?? '0');
  }
  useEffect(() => { cargar(); }, []);

  const guardado = (msg) => { setOk(msg); setError(''); };

  async function agregar(e) {
    e.preventDefault(); setOk('');
    const { error: err } = await supabase.from('cuentas_pago').insert({ banco: f.banco.trim(), titular: f.titular.trim(), numero: f.numero.trim(), tipo: f.tipo });
    if (err) return setError(mensajeError(err));
    setF({ banco: '', titular: '', numero: '', tipo: 'Caja de ahorro' });
    guardado('Cuenta agregada.'); cargar();
  }
  async function alternar(c) {
    const { error: err } = await supabase.from('cuentas_pago').update({ activo: !c.activo }).eq('id', c.id);
    if (err) setError(mensajeError(err)); else cargar();
  }
  async function subirQr(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(''); setOk('');
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) return setError('Sube el QR como imagen JPG o PNG.');
    setSubiendo(true);
    try {
      const img = await imageCompression(archivo, { maxSizeMB: 0.5, maxWidthOrHeight: 1000, useWebWorker: true });
      const ruta = `qr-${Date.now()}.${archivo.type === 'image/png' ? 'png' : 'jpg'}`;
      const { error: errSubida } = await supabase.storage.from('pagos').upload(ruta, img, { contentType: archivo.type });
      if (errSubida) throw errSubida;
      const { data } = supabase.storage.from('pagos').getPublicUrl(ruta);
      const { error: err } = await supabase.from('parametros').upsert({ clave: 'qr_pago_url', valor: data.publicUrl });
      if (err) throw err;
      guardado('QR actualizado.'); cargar();
    } catch (err) { setError(mensajeError(err)); } finally { setSubiendo(false); e.target.value = ''; }
  }
  async function guardarEnvio(e) {
    e.preventDefault(); setOk('');
    const n = Number(envio);
    if (!Number.isFinite(n) || n < 0) return setError('El costo de envío debe ser 0 o mayor.');
    const { error: err } = await supabase.from('parametros').upsert({ clave: 'costo_envio', valor: n.toFixed(2) });
    if (err) return setError(mensajeError(err));
    guardado('Costo de envío guardado.');
  }

  return (
    <div className="pila" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: '2rem' }}>Datos de pago</h1>
      <p className="tenue">Lo que verá el cliente al terminar su pedido: cuentas bancarias y QR. Sin al menos una cuenta activa o un QR, la tienda no deja finalizar pedidos con pago anticipado.</p>
      {error && <p className="aviso aviso--error" role="alert">{error}</p>}
      {ok && <p className="aviso aviso--ok" role="status">{ok}</p>}

      <section className="tarjeta pila">
        <h2>Cuentas bancarias</h2>
        {!cuentas ? <div className="cargando" style={{ height: 80 }} /> : (
          <div className="tabla-envoltura"><table className="tabla"><tbody>
            {cuentas.length === 0 && <tr><td className="tenue">Aún no hay cuentas.</td></tr>}
            {cuentas.map((c) => (
              <tr key={c.id}><td><strong>{c.banco}</strong> · {c.tipo}<div className="tenue chico">{c.titular}</div></td><td>{c.numero}</td>
                <td><span className={`insignia ${c.activo ? 'insignia--ok' : ''}`}>{c.activo ? 'Activa' : 'Oculta'}</span></td>
                <td><button className="btn btn--chico" onClick={() => alternar(c)}>{c.activo ? 'Ocultar' : 'Activar'}</button></td></tr>
            ))}
          </tbody></table></div>
        )}
        <form className="dos-col" onSubmit={agregar}>
          <div className="campo"><label htmlFor="banco">Banco</label><input id="banco" className="entrada" required maxLength={60} value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} /></div>
          <div className="campo"><label htmlFor="tipo">Tipo de cuenta</label>
            <select id="tipo" className="entrada" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}><option>Caja de ahorro</option><option>Cuenta corriente</option></select></div>
          <div className="campo"><label htmlFor="titular">Titular</label><input id="titular" className="entrada" required maxLength={100} value={f.titular} onChange={(e) => setF({ ...f, titular: e.target.value })} /></div>
          <div className="campo"><label htmlFor="numero">Número de cuenta</label><input id="numero" className="entrada" required maxLength={40} value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
          <div><button className="btn btn--primario">Agregar cuenta</button></div>
        </form>
      </section>

      <section className="tarjeta pila">
        <h2>QR de pago</h2>
        {qr ? <img src={qr} alt="QR de pago actual" width="200" height="200" style={{ objectFit: 'contain', background: '#fff', borderRadius: 10 }} /> : <p className="tenue">Aún no hay QR.</p>}
        <div className="campo"><label htmlFor="qr">{qr ? 'Reemplazar QR' : 'Subir QR'} (JPG o PNG)</label>
          <input id="qr" className="entrada" type="file" accept="image/jpeg,image/png" disabled={subiendo} onChange={subirQr} />
          {subiendo && <span className="ayuda">Subiendo…</span>}</div>
      </section>

      <section className="tarjeta pila">
        <h2>Costo de envío a domicilio</h2>
        <form className="fila" onSubmit={guardarEnvio}>
          <input className="entrada" style={{ maxWidth: 160 }} aria-label="Costo de envío en bolivianos" inputMode="decimal" value={envio} onChange={(e) => setEnvio(e.target.value)} />
          <span className="tenue">Bs.</span><button className="btn">Guardar</button>
        </form>
        <p className="ayuda">Mientras el dueño no defina una tarifa (hallazgo H-17) el envío queda en Bs. 0,00.</p>
      </section>
    </div>
  );
}
