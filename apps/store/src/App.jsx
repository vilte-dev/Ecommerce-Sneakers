import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RutaPrivada from './components/RutaPrivada.jsx';
import Proximamente from './components/Proximamente.jsx';
import Inicio from './pages/Inicio.jsx';
import Catalogo from './pages/Catalogo.jsx';
import Producto from './pages/Producto.jsx';
import Carrito from './pages/Carrito.jsx';
import Ingresar from './pages/Ingresar.jsx';
import Registro from './pages/Registro.jsx';
import Recuperar from './pages/Recuperar.jsx';
import Restablecer from './pages/Restablecer.jsx';
import Terminos from './pages/Terminos.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="producto/:id" element={<Producto />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="ingresar" element={<Ingresar />} />
        <Route path="registro" element={<Registro />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="restablecer" element={<Restablecer />} />
        <Route path="terminos" element={<Terminos />} />
        <Route element={<RutaPrivada />}>
          <Route path="pedido" element={<Proximamente titulo="Confirmar pedido" sprint={2} historias="HU-08, HU-09, HU-10" detalle="Aquí elegirás envío a domicilio en Tarija o retiro en tienda, verás las cuentas y el QR de pago, y subirás la foto de tu comprobante." />} />
          <Route path="mis-pedidos" element={<Proximamente titulo="Mis pedidos" sprint={2} historias="HU-08, HU-12" detalle="Aquí seguirás el estado de tus pedidos." />} />
        </Route>
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
