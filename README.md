# 👟 Sneakers — Sistema Omnicanal de E-commerce y Gestión Comercial de Calzado

> Proyecto académico universitario aplicado a **Sneakers**, un negocio real de calzado en la ciudad de Tarija, Bolivia.

![Estado](https://img.shields.io/badge/estado-Sprint%203%20completado-yellow)
![Versión](https://img.shields.io/badge/versi%C3%B3n-0.3.1-informational)
![Tipo](https://img.shields.io/badge/tipo-proyecto%20acad%C3%A9mico-blue)
![Documentación](https://img.shields.io/badge/docs-ISO%2FIEC%2FIEEE%2029148-green)

🔗 **Seguimiento del proyecto (Jira):** [Tablero SNEAK — Backlog](https://samuelvilte64.atlassian.net/jira/software/projects/SNEAK/boards/3/backlog)

---

## 📑 Tabla de contenidos

1. [Introducción y contexto del negocio](#1-introducción-y-contexto-del-negocio)
2. [Equipo del proyecto](#2-equipo-del-proyecto)
3. [Metodología y seguimiento](#3-metodología-y-seguimiento)
4. [Marco normativo y restricciones de diseño](#4-marco-normativo-y-restricciones-de-diseño)
5. [Actores del sistema](#5-actores-del-sistema)
6. [Requerimientos funcionales y su avance](#6-requerimientos-funcionales-rf-y-su-avance)
7. [Requerimientos no funcionales y su avance](#7-requerimientos-no-funcionales-rnf-y-su-avance)
8. [Tecnologías](#8-tecnologías)
9. [Estructura del repositorio](#9-estructura-del-repositorio)
10. [Instalación y ejecución](#10-instalación-y-ejecución)
11. [Pruebas](#11-pruebas)
12. [Hoja de ruta por sprint](#12-hoja-de-ruta-por-sprint)
13. [Decisiones de diseño](#13-decisiones-de-diseño)
14. [Uso académico](#14-uso-académico)
15. [Escalabilidad futura](#15-escalabilidad-futura)

---

## 1. Introducción y contexto del negocio

El presente proyecto comprende el diseño y desarrollo de una plataforma informática para la gestión comercial de **Sneakers**, un negocio de calzado ubicado en la ciudad de Tarija.

| Componente | Descripción |
|---|---|
| **Infraestructura física** | Una (1) sucursal comercial de calzado ubicada en la ciudad de Tarija. |
| **Capital humano** | Un (1) operario multifuncional, encargado tanto de la atención presencial como de la preparación de despachos digitales. |
| **Nivel directivo** | El Dueño/Socio del negocio, responsable de la supervisión, análisis financiero y toma de decisiones operativas. |

La solución integra un canal de comercio electrónico (**E-commerce**) y un sistema interno de gestión para:

- Centralizar el control de inventarios.
- Automatizar los flujos de trabajo omnicanal.
- Dotar al negocio de herramientas analíticas para la planificación estacional de inversiones en mercadería.

### Alcance del proyecto

**El sistema incluye:**

- Tienda virtual (e-commerce) con catálogo, filtros, tallas y carrito de compras.
- Pedidos con pago offline (transferencia o QR) y validación manual del comprobante.
- Despacho a domicilio en Tarija o retiro en tienda.
- Control de inventario con alertas de stock mínimo.
- Punto de venta (POS), comprobante de venta no fiscal y cierre de caja diario.
- Programa de fidelidad por volumen de compras (5 % tras la 10.ª compra).
- Paneles analíticos para el dueño: tendencias estacionales, rotación, retorno de inversión y simulador presupuestario *(Sprint 4)*.

**El sistema NO incluye:**

- Facturación electrónica ni integración con el Servicio de Impuestos Nacionales (SIN).
- Pasarela de pagos en línea: el pago es offline y lo valida manualmente el empleado.
- Procesamiento de pagos con tarjeta: **en caja solo se cobra con efectivo o QR**; el QR únicamente se registra (migración `0007_solo_efectivo_qr.sql`).
- Envío automático de mensajes por WhatsApp: el empleado envía la plantilla mediante un botón.
- Integración con el servicio de motomandados: solo se registra el repartidor y el estado del despacho.
- Envíos fuera de la ciudad de Tarija.
- Aplicación móvil nativa: la tienda es web y mobile-first.
- Contabilidad completa, planillas ni gestión de recursos humanos.
- Gestión de múltiples sucursales ni de productos distintos al calzado (ver [Escalabilidad futura](#15-escalabilidad-futura)).

---

## 2. Equipo del proyecto

| Integrante | Rol en el proyecto (según el plan en Jira) | Correo |
|---|---|---|
| Romeo Lancelot Chavez Cuellar | Catálogo interno (modelos, variantes, imágenes), inventario, alertas de stock, caja congelada sin conexión | tj.romeo.chavez.c@upds.net.bo |
| Pablo Cesar Maigua Ortiz | Product Owner / producto: matriz de permisos, wireframes, términos y devoluciones (Ley 453), demo y aceptación | pcmaiguaortiz@gmail.com |
| Samuel Narciso Vilte Tarraga | Tienda virtual, pedidos y pagos offline, despacho, POS, comprobantes y analítica | samuelvilte64@gmail.com |
| Manuel Ignacio Aramayo Hoyos | Base de datos, Auth, roles y RLS, Storage, stock y fidelidad, despliegue | aramayomanuel2@gmail.com |
| Rodrigo Sebastián Guerrero Riera | Calidad (QA): plan de pruebas, CI y revisión de Definition of Done | guerrerorierarodrigosebastian@gmail.com |

> ⚠️ El reparto original (README v1) asignaba módulos por requerimiento; el plan vigente es el de Jira, donde cada historia indica sus responsables. Confirmar esta tabla con el equipo.

**Información académica**

- **Universidad:** Universidad Privada Domingo Sabio
- **Carrera:** Ingeniería de Sistemas
- **Materia:** Desarrollo de Sistemas II
- **Docente:** Ing. Eddy Roger Calderón Caquiva
- **Gestión:** 2026

---

## 3. Metodología y seguimiento

El trabajo se organiza con **Scrum** y se sigue en Jira:

🔗 **[Tablero y backlog del proyecto (clave SNEAK)](https://samuelvilte64.atlassian.net/jira/software/projects/SNEAK/boards/3/backlog)**

| Elemento | Cómo se usa |
|---|---|
| **Historias de usuario (HU)** | `HU-01` a `HU-24`, cada una con requerimientos del SRS, prioridad MoSCoW y criterios de aceptación Dado / Cuando / Entonces. |
| **Historias de mejora visual** | `HU-UI-01` a `HU-UI-12` (etiqueta `ui`), presentación sin cambios de reglas de negocio. Detalle en `docs/hu-ui-sprint3.md`. |
| **Sub-tareas / tareas** | `T01`–`T34`, con responsable y horas estimadas. |
| **Etiquetas** | `sprint-N`, `resp-<nombre>`, `ui`, `calidad`, `producto`. |
| **Definition of Done** | PR revisado por otro integrante; QA aprobado por Rodrigo; integrado en `develop` sin conflictos; cumple los RNF aplicables; documentación actualizada; aceptada por el PO en la Sprint Review. |

### Flujo de trabajo con Git

- Ramas `main` (estable, protegida), `develop` (integración) y ramas cortas por tarea con el ID de la historia, por ejemplo `feature/HU-15-pos`.
- Pull request con al menos una revisión de otro integrante antes de mezclar.
- Todo cambio en la base de datos se registra como migración en `supabase/migrations`.
- Cada sprint deja su documento en `docs/` y su entrada en `CHANGELOG.md`.

---

## 4. Marco normativo y restricciones de diseño

### 4.1 Normativa legal y regulatoria (Bolivia)

| Norma | Aplicación en el proyecto |
|---|---|
| **Ley Nº 164** (Ley General de Telecomunicaciones, TIC) | Valida legalmente la celebración de transacciones mediante comercio electrónico y el uso del carrito de compras. |
| **Código de Comercio de Bolivia** | Obliga a registrar los ingresos de forma cronológica: justifica los cierres de caja y que ventas, comprobantes y cierres sean **inalterables** (solo se anulan con motivo). |
| **Ley Nº 453** (Derechos de las usuarias, usuarios, consumidoras y consumidores) | Precios en Bolivianos (Bs.) y términos de servicio y política de cambios y devoluciones (página `/terminos`). |
| **Constitución Política del Estado (Art. 130)** | Cuidado de datos personales: control de accesos por rol y contraseñas con hash. |
| **Decreto Supremo Nº 1793** | Reglamento de la Ley 164; marco de protección de datos personales en TIC. |

### 4.2 Estándares tecnológicos y de calidad de software

| Estándar | Aplicación en el proyecto |
|---|---|
| **ISO/IEC/IEEE 29148** | Estructura del documento de requisitos (SRS). |
| **ISO/IEC 25010** | Calidad: desempeño, seguridad, usabilidad (responsive, accesibilidad) y fiabilidad. |
| **ISO 9407** (Mondopoint) | Referencia para la matriz de tallas (Niño, Juvenil, Adulto). |

---

## 5. Actores del sistema

| # | Actor | Descripción |
|---|---|---|
| 1 | **Cliente** | Consulta el catálogo, arma el carrito, confirma pedidos, sube el comprobante y sigue su entrega. |
| 2 | **Empleado / Vendedor** | Vende en caja (POS), valida comprobantes, gestiona despachos, hace el cierre de caja. Solo ve sus propias ventas y cierres. |
| 3 | **Dueño** | Acceso a paneles ejecutivos (Resumen ejecutivo, y en Sprint 4 los analíticos). Puede operar caja y pedidos. |
| 4 | **Administrador del sistema** | Gestiona catálogo, marcas, usuarios, datos de pago y alertas de stock. **No valida pagos** (matriz de permisos B.3 del SRS). |

---

## 6. Requerimientos funcionales (RF) y su avance

Resumen de los RF de alcance y su estado a la fecha (**Sprint 3 completado**). El detalle de cada RF está en el SRS.

| Grupo | RF | Historia(s) | Estado |
|---|---|---|---|
| Usuarios y roles | RF-01 Autenticación de clientes | HU-02 | ✅ Sprint 1 |
| | RF-02 Interfaz de operarios | HU-03, HU-11 | ✅ Sprint 2 |
| | RF-03 Acceso ejecutivo | HU-03 | ✅ Resumen ejecutivo (se amplía en Sprint 4) |
| | RF-04 Gestión de configuración | HU-04 | ✅ Modelos, marcas y usuarios |
| Catálogo | RF-05 Catálogo dinámico | HU-05 | ✅ Sprint 1 |
| | RF-06 Validación de tallas (Niño 20–34, Juvenil 35–39, Adulto 40+) | HU-06 | ✅ Sprint 1 (UI y BD) |
| | RF-07 Carrito | HU-07 | ✅ Sprint 1 |
| Pedidos | RF-08 Instrucciones de pago offline | HU-09 | ✅ Sprint 2 |
| | RF-09 Carga de comprobante | HU-10 | ✅ Sprint 2 |
| | RF-10 Parámetros de despacho | HU-08 | ✅ Sprint 2 |
| Inventario | RF-11 Visibilidad de stock | HU-04, HU-13 | ✅ Sprint 1–2 |
| | RF-12 Sincronización automática | HU-11 | ✅ Sprint 2 |
| | RF-14 Alerta de stock mínimo | HU-14 | ✅ Sprint 3 (panel interno) |
| POS y entregas | RF-15 Terminal de venta en caja | HU-15 | ✅ Sprint 3 (efectivo o QR) |
| | RF-18 Comprobante de venta no fiscal | HU-16 | ✅ Sprint 3 |
| | RF-19 Cierre de caja diario | HU-17 | ✅ Sprint 3 |
| | RF-20 Control de entrega local | HU-12 | ✅ Sprint 2 |
| Fidelización y analítica | RF-21 Fidelidad por volumen | HU-18 | ✅ Sprint 3 |
| | RF-22 Enlace a WhatsApp | HU-12 | ✅ Sprint 2 |
| | RF-23 Tendencia estacional | HU-19 | ⏳ Sprint 4 |
| | RF-24 Predicción de abastecimiento | HU-22 | ⏳ Sprint 4 |
| | RF-25 Retorno de inversión | HU-20 | ⏳ Sprint 4 |
| | RF-26 Rotación de inventario | HU-21 | ⏳ Sprint 4 |
| | RF-27 Simulador presupuestario | HU-22 | ⏳ Sprint 4 |

Fuera de alcance (se conserva la numeración del SRS): RF-13 (traspasos), RF-16 (factura simulada) y RF-17 (datos fiscales).

**Regla de negocio de tallas (RF-06):** Niño del 20 al 34 · Juvenil del 35 al 39 · Adulto del 40 en adelante. Se valida en la tienda **y** en la base de datos.

---

## 7. Requerimientos no funcionales (RNF) y su avance

| ID | Tema | Estado |
|---|---|---|
| RNF-01 | Disponibilidad 99,5 % | ⏳ Sprint 4 (HU-23, despliegue estable) |
| RNF-02 | Catálogo en menos de 3 s en móvil | ✅ verificado en HU-05 |
| RNF-03 | 50 usuarios concurrentes | 🔎 pendiente de prueba de carga |
| RNF-04 | Escalabilidad (modelo de datos por sucursal) | ✅ tabla `sucursales` y stock por sucursal |
| RNF-05 | Contraseñas con hash | ✅ Supabase Auth |
| RNF-06 | HTTPS | ⏳ Sprint 4 (al desplegar) |
| RNF-07 | Seguridad por roles (RLS) | ✅ Sprint 1–2; el empleado no ve márgenes ni paneles del Dueño |
| RNF-08 | Mobile-first | ✅ tienda mobile-first; probada a 360 px |
| RNF-09 | Venta en máximo 4 clics | ✅ **3 clics** (talla → Cobrar → Imprimir) |
| RNF-10 | Español y Bs. | ✅ |
| RNF-11 | Multi-navegador | 🔎 comprobar en la prueba final |
| RNF-12 | Respaldos diarios a medianoche | ⏳ Sprint 4 (HU-23) |
| RNF-13 | Caja congelada sin conexión | ✅ Sprint 3 (HU-24), con reintento idempotente |
| RNF-14 | Compresión de imágenes | ✅ `browser-image-compression` (catálogo y comprobantes) |
| RNF-15 | Modularidad | ✅ monorepo con dos apps desacopladas |

Accesibilidad añadida en la mejora visual (HU-UI-12): contraste de bordes ≥ 3:1, texto pequeño ≥ 4,5:1, foco visible y respeto de «reducir movimiento».

---

## 8. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite (dos aplicaciones: tienda pública y sistema interno) |
| Backend / BaaS | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Base de datos | PostgreSQL con Row Level Security (RLS); la lógica crítica (ventas, stock, fidelidad, cierres) vive en funciones SQL |
| Autenticación | Supabase Auth |
| Compresión de imágenes | `browser-image-compression` |
| Gráficos | Recharts *(se incorpora en Sprint 4 con los paneles del Dueño)* |
| Pruebas | `node --test` (unitarias) y scripts SQL con `ROLLBACK` |
| Diseño | Sistema propio: tinta índigo + hueso + volt, tipografía Archivo expandida (`packages/shared/src/styles.css`) |

---

## 9. Estructura del repositorio

Monorepo con dos aplicaciones desacopladas (RNF-15).

```
sneakers/
├── README.md
├── CHANGELOG.md                 # Cambios por sprint (v0.2.0, v0.3.0, v0.3.1)
├── docs/
│   ├── sprint-3.md              # Historias del sprint, criterios, decisiones y guion de demo
│   ├── hu-ui-sprint3.md         # Historias de mejora visual HU-UI-01 a 12
│   └── Sneakers_HU_UI_Import.csv# Importación a Jira de las HU-UI
├── apps/
│   ├── store/                   # E-commerce público (mobile-first)
│   │   └── src/{pages,components,features/{auth,cart,catalog,orders},lib}
│   └── admin/                   # POS + paneles de empleado, dueño y administrador
│       └── src/{pages,components,features/{auth,caja,alertas,pedidos},lib}
├── packages/
│   └── shared/                  # Cliente Supabase, roles, tallas, formato Bs., estados, caja, WhatsApp, estilos
│       ├── src/
│       └── test/shared.test.js
├── supabase/
│   ├── migrations/              # 0001 esquema · 0002 funciones · 0003 RLS · 0004 storage
│   │                            # 0005 pedidos (S2) · 0006 caja y fidelidad (S3) · 0007 solo efectivo/QR
│   ├── tests/                   # sprint2.test.sql, sprint3.test.sql
│   ├── harness/stubs.sql        # Solo para PostgreSQL local sin Supabase
│   ├── seed.sql                 # Datos ficticios de prueba
│   └── README.md                # Orden de migraciones y puesta en marcha de la BD
├── .env.example
├── .gitignore
└── package.json                 # Workspaces
```

Pendiente de agregar al repositorio: `.github/workflows` (CI), diagramas (casos de uso, clases, ER) y manual de usuario.

---

## 10. Instalación y ejecución

**Requisitos:** Node.js 20+, una cuenta de Supabase y (opcional) la CLI de Supabase.

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd sneakers

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 4. Preparar la base de datos (ver supabase/README.md)
#    Ejecutar en orden las migraciones 0001 a 0006 (y 0007 si la base ya corrió 0006 antes del cambio) y, opcionalmente, seed.sql

# 5. Ejecutar las aplicaciones
npm run dev:store     # Tienda pública
npm run dev:admin     # Sistema interno
```

Puesta en marcha mínima del negocio:

1. Registrarse desde la tienda y convertirse en administrador con el `update` indicado en `supabase/README.md` (el rol nunca se elige en el registro).
2. En el sistema interno: **Usuarios** (asignar rol de empleado y dueño) y **Datos de pago** (cuenta bancaria y QR; sin esto la tienda no deja finalizar pedidos).
3. Configurar en la tabla `parametros` el nombre, dirección y teléfono que salen en el comprobante.

> ⚠️ Nunca subir al repositorio la clave `service_role` de Supabase ni el archivo `.env`. En el frontend solo se usa la `anon key`.

---

## 11. Pruebas

```bash
npm test                                                                      # 14 unitarias (Node)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sprint2.test.sql    # 56 comprobaciones SQL
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sprint3.test.sql    # 88 comprobaciones SQL
```

Los scripts SQL terminan en `ROLLBACK`: no dejan datos. Ejecutarlos solo en una base de desarrollo.

---

## 12. Hoja de ruta por sprint

- [x] Levantamiento y documentación de requerimientos (SRS)
- [x] **Sprint 1 — Fundamentos** (v0.1.0): BD con roles y RLS (HU-01), registro/login/recuperación (HU-02), alta de modelos con stock y fotos comprimidas (HU-04), catálogo con filtros (HU-05), tallas válidas (HU-06), carrito (HU-07)
- [x] **Sprint 2 — Pedidos y pago offline** (v0.2.0): acceso por rol (HU-03), pedido con envío o retiro (HU-08), cuentas y QR (HU-09), comprobante (HU-10), validación y descuento de stock (HU-11), repartidor y WhatsApp (HU-12), inventario (HU-13)
- [x] **Sprint 3 — Caja, comprobantes y fidelidad** (v0.3.0): alertas de stock (HU-14), POS (HU-15), comprobante no fiscal (HU-16), cierre de caja (HU-17), fidelidad 5 % (HU-18), caja congelada sin internet (HU-24)
- [x] **Mejora visual** (v0.3.1): HU-UI-01 a HU-UI-12 (identidad de marca, portada, tarjetas, ficha, accesibilidad, sistema interno)
- [ ] **Sprint 4 — Analítica y salida a producción**: tendencia estacional (HU-19), retorno por marca (HU-20), rotación (HU-21), recomendaciones y simulador (HU-22), respaldos, HTTPS y despliegue (HU-23); compras a proveedor y costos (RF-28)
- [ ] Modelado documentado (casos de uso, clases, ER), manual de usuario y CI
- [ ] Pruebas finales: concurrencia (RNF-03), multi-navegador (RNF-11) y seguridad

---

## 13. Decisiones de diseño

Para confirmar con el Dueño y el docente en la Sprint Review:

1. **La compra se cuenta al confirmarse** (venta en caja o validación del comprobante web), no al entregar.
2. **Fidelidad repetitiva:** cada 10 compras confirmadas, 5 % sobre el importe neto (sin envío) de la siguiente, una sola vez por ciclo. Anular una venta o cancelar un pedido devuelve el contador.
3. **Caja solo con efectivo o QR.** La tarjeta se retiró; el QR solo se registra y el efectivo se arquea en el cierre.
4. **Cierre de caja por empleado**, confirmado e inalterable; no hay fondo inicial de caja.
5. **Anulación de ventas** solo antes del cierre y con motivo; repone stock y fidelidad. Nada se borra.
6. **Impresión** con el diálogo del navegador (tiquetera de 80 mm o «Guardar como PDF»); el comprobante lleva «Documento no válido como factura».
7. **Alertas de stock** en el panel interno; mínimo por defecto = 2 por modelo y talla.
8. **Cierre de sesión por inactividad** del sistema interno a los 30 minutos.

---

## 14. Uso académico

Este proyecto fue desarrollado con fines **académicos** en la Universidad Privada Domingo Sabio, aplicado al negocio Sneakers de la ciudad de Tarija.

---

## 15. Escalabilidad futura

El negocio cuenta con **otras dos sucursales de ropa en Tarija**. El modelo de datos ya es por sucursal (RNF-04 y RNF-15), de modo que la ampliación contemplaría:

- Stock segmentado por tienda (extensión del RF-11).
- Módulo de traspasos entre sucursales (RF-13).
- Matriz de tallas y categorías propias para ropa.
- Paneles analíticos consolidados por sucursal para el dueño.
