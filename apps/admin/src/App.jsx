import { Routes, Route, Navigate } from 'react-router-dom';
import { GERENCIA, OPERADORES, ROLES, STAFF } from '@sneakers/shared';
import RequireRole from './components/RequireRole.jsx';
import Shell from './components/Shell.jsx';
import Proximamente from './components/Proximamente.jsx';
import { MODULOS } from './navegacion.js';
import Login from './pages/Login.jsx';
import Inicio from './pages/Inicio.jsx';
import Modelos from './pages/Modelos.jsx';
import ModeloForm from './pages/ModeloForm.jsx';
import Marcas from './pages/Marcas.jsx';
import Inventario from './pages/Inventario.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Pedidos from './pages/Pedidos.jsx';
import PedidoInterno from './pages/PedidoInterno.jsx';
import Pagos from './pages/Pagos.jsx';
import Resumen from './pages/Resumen.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="ingresar" element={<Login />} />
      <Route element={<RequireRole roles={STAFF} />}>
        <Route element={<Shell />}>
          <Route index element={<Inicio />} />
          <Route path="inventario" element={<Inventario />} />
          <Route element={<RequireRole roles={GERENCIA} />}>
            <Route path="modelos" element={<Modelos />} />
            <Route path="modelos/nuevo" element={<ModeloForm />} />
            <Route path="modelos/:id" element={<ModeloForm />} />
            <Route path="marcas" element={<Marcas />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="pagos" element={<Pagos />} />
          </Route>
          <Route element={<RequireRole roles={OPERADORES} />}>
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="pedidos/:id" element={<PedidoInterno />} />
          </Route>
          <Route element={<RequireRole roles={[ROLES.DUENO]} />}>
            <Route path="resumen" element={<Resumen />} />
          </Route>
          {/* Módulos de sprints futuros: la ruta, el rol y la pantalla ya existen. */}
          {MODULOS.filter((m) => m.sprint).map((m) => (
            <Route key={m.ruta} element={<RequireRole roles={m.roles} />}>
              <Route path={m.ruta.slice(1)} element={<Proximamente titulo={m.texto} sprint={m.sprint} historias={m.historias} detalle={m.detalle} />} />
            </Route>
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
