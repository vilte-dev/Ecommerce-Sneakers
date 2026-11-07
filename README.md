# 👟 Sneakers — Sistema Omnicanal de E-commerce y Gestión Comercial de Calzado

> Proyecto académico universitario aplicado a **Sneakers**, un negocio real de calzado en la ciudad de Tarija, Bolivia.

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![Tipo](https://img.shields.io/badge/tipo-proyecto%20acad%C3%A9mico-blue)
![Documentaci%C3%B3n](https://img.shields.io/badge/docs-ISO%2FIEC%2FIEEE%2029148-green)

---

## 📑 Tabla de contenidos

1. [Introducción y contexto del negocio](#1-introducción-y-contexto-del-negocio)
2. [Equipo del proyecto](#2-equipo-del-proyecto)
3. [Marco normativo y restricciones de diseño](#3-marco-normativo-y-restricciones-de-diseño)
4. [Actores del sistema](#4-actores-del-sistema)
5. [Requerimientos funcionales](#5-requerimientos-funcionales-rf)
6. [Requerimientos no funcionales](#6-requerimientos-no-funcionales-rnf)
7. [Tecnologías](#7-tecnologías)
8. [Estructura del repositorio](#8-estructura-del-repositorio)
9. [Instalación y ejecución](#9-instalación-y-ejecución)
10. [Hoja de ruta](#10-hoja-de-ruta)
11. [Uso académico](#11-uso-académico)
12. [Escalabilidad futura](#12-escalabilidad-futura)

---

## 1. Introducción y contexto del negocio

El presente proyecto comprende el diseño y desarrollo de una plataforma informática para la gestión comercial de **Sneakers**, un negocio de calzado ubicado en la ciudad de Tarija. El modelo operativo actual del negocio se caracteriza por una estructura compacta y eficiente:

| Componente | Descripción |
|---|---|
| **Infraestructura física** | Una (1) sucursal comercial de calzado ubicada en la ciudad de Tarija. |
| **Capital humano** | Un (1) operario multifuncional, encargado tanto de la atención presencial como de la preparación de despachos digitales. |
| **Nivel directivo** | El Dueño/Socio del negocio, responsable de la supervisión, análisis financiero y toma de decisiones operativas. |

La solución tecnológica integra un canal de comercio electrónico (**E-commerce**) y un sistema interno de gestión para:

- Centralizar el control de inventarios.
- Automatizar los flujos de trabajo omnicanal.
- Dotar al negocio de herramientas analíticas para la planificación estacional de inversiones en mercadería.

### Alcance del proyecto

**El sistema incluye:**

- Tienda virtual (e-commerce) con catálogo, filtros, tallas y carrito de compras.
- Pedidos con pago offline (transferencia o QR) y validación manual del comprobante.
- Despacho a domicilio en Tarija o retiro en tienda.
- Control de inventario con alertas de stock mínimo.
- Punto de venta (POS), comprobante de venta y cierre de caja diario.
- Programa de fidelidad por volumen de compras.
- Paneles analíticos para el dueño: tendencias estacionales, rotación, retorno de inversión y simulador presupuestario.

**El sistema NO incluye:**

- Facturación electrónica ni integración con el Servicio de Impuestos Nacionales (SIN).
- Pasarela de pagos en línea: el pago es offline y lo valida manualmente el empleado.
- Procesamiento de pagos con tarjeta: el sistema solo registra la venta, no se conecta con terminales bancarias.
- Envío automático de mensajes por WhatsApp: el empleado envía la plantilla mediante un botón.
- Integración con el servicio de motomandados: solo se registra el repartidor y el estado del despacho.
- Envíos fuera de la ciudad de Tarija.
- Aplicación móvil nativa: la tienda es web y mobile-first.
- Contabilidad completa, planillas ni gestión de recursos humanos.
- Gestión de múltiples sucursales ni de productos distintos al calzado (ver [Escalabilidad futura](#12-escalabilidad-futura)).

---

## 2. Equipo del proyecto

| Integrante | Rol en el proyecto | Correo |
|---|---|---|
| Romeo Lancelot Chavez Cuellar | Base de datos, seguridad y roles (líder técnico) | tj.romeo.chavez.c@upds.net.bo |
| Pablo Cesar Maigua Ortiz | Tienda virtual: catálogo, tallas y carrito | pcmaiguaortiz@gmail.com |
| Samuel Narciso Vilte Tarraga | Pedidos, comprobantes de pago y entregas | samuelvilte64@gmail.com |
| Manuel Ignacio Aramayo Hoyos | Inventario y punto de venta (POS) | aramayomanuel2@gmail.com |
| Rodrigo Sebastián Guerrero Riera | Fidelización y analítica del negocio | guerrerorierarodrigosebastian@gmail.com |

**Información académica**

- **Universidad:** Universidad Privada Domingo Sabio
- **Carrera:** Ingeniería de Sistemas
- **Materia:** Desarrollo de Sistemas II
- **Docente:** Ing. Eddy Roger Calderón Caquiva
- **Gestión:** 2026

---

## 3. Marco normativo y restricciones de diseño

Para garantizar el cumplimiento legal y los estándares internacionales de ingeniería de software exigidos en el ámbito universitario, el sistema se rige bajo los siguientes marcos.

### 3.1 Normativa legal y regulatoria (Bolivia)

| Norma | Aplicación en el proyecto |
|---|---|
| **Ley Nº 164** (Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación) | Valida legalmente la celebración de transacciones mediante comercio electrónico y el uso del carrito de compras en el territorio boliviano. |
| **Código de Comercio de Bolivia** (Artículos sobre Contabilidad y Libros de Comercio) | Regula la obligatoriedad de registrar los ingresos de forma cronológica, justificando el diseño de los cierres de caja y el almacenamiento seguro del historial de transacciones para auditorías. |
| **Ley Nº 453** (Ley General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores) | Exige total transparencia en la visualización de precios en moneda nacional (Bolivianos - Bs.), además de la inclusión explícita de términos de servicio y políticas claras para cambios de calzado o devoluciones. |
| **Constitución Política del Estado (Art. 130 – Acción de Protección de Privacidad)** | Respalda el cuidado de los datos personales de los clientes (correo, WhatsApp, CI o celular) que el sistema registra, justificando el cifrado de credenciales y el control de accesos por rol. |
| **Decreto Supremo Nº 1793** (Reglamento de la Ley Nº 164) | Complementa la Ley 164 y constituye el marco general de protección de datos personales en el ámbito de las TIC. |

### 3.2 Estándares tecnológicos y de calidad de software

| Estándar | Aplicación en el proyecto |
|---|---|
| **ISO/IEC/IEEE 29148** (sucesora de IEEE 830) | Estructura metodológica empleada para la elaboración del documento de requerimientos, asegurando la correcta separación y especificación de requerimientos funcionales y no funcionales. |
| **ISO/IEC 25010** (Quality Product Model) | Marco de referencia para establecer los parámetros de calidad del software, con énfasis en eficiencia de desempeño (tiempos de carga), seguridad (cifrado de datos), usabilidad (diseño responsive) y fiabilidad. |
| **ISO 9407** (Shoe sizes – Mondopoint system) | Referencia conceptual para estructurar de manera organizada la matriz de tallas en la base de datos (Niño, Juvenil, Adulto). |

---

## 4. Actores del sistema

Se han definido cuatro (4) actores clave con responsabilidades y niveles de acceso diferenciados para mitigar la sobrecarga operativa de la empresa:

| # | Actor | Descripción |
|---|---|---|
| 1 | **Cliente** (Comprador Omnicanal) | Actor externo que interactúa de manera pública con el e-commerce. Consulta el catálogo unificado de calzados, realiza reservas, simula pedidos, adjunta comprobantes y hace el seguimiento de sus entregas en Tarija. |
| 2 | **Empleado / Vendedor** (Atención y Gestión Operativa) | Actor interno encargado del día a día de la sucursal. Registra ventas directas en la caja física, realiza cierres de caja y valida manualmente los pedidos de la web tras verificar los fondos bancarios. |
| 3 | **Dueño** (Monitoreo y Soporte Ocasional) | Actor interno de nivel estratégico. Tiene acceso prioritario a paneles analíticos avanzados, gráficos estacionales y de rentabilidad. Posee permisos extendidos para realizar ventas en caja de manera eventual si la demanda de la tienda física así lo requiere. |
| 4 | **Administrador del Sistema** (Gestión de Catálogo e Inventario) | Actor interno responsable del mantenimiento del sistema. Gestiona el catálogo de calzados (alta de modelos, carga de fotos, precios), define los parámetros técnicos del stock mínimo y monitorea la salud técnica de la aplicación. Este rol puede ser asumido por el Dueño o un empleado delegado. |

---

## 5. Requerimientos funcionales (RF)

### 5.1 Gestión de usuarios, accesos y roles

| ID | Nombre | Descripción |
|---|---|---|
| **RF-01** | Autenticación de Clientes | Permitir al cliente registrarse, iniciar sesión y recuperar su contraseña a través de credenciales digitales asociadas a su correo o WhatsApp. |
| **RF-02** | Interfaz de Operarios | Permitir a los empleados autenticarse de forma segura en sus terminales físicas para registrar transacciones directas y alterar estados de órdenes web. |
| **RF-03** | Acceso Ejecutivo | Proveer al dueño un módulo exclusivo de visualización de métricas financieras, auditorías operativas y resúmenes consolidados en tiempo real. |
| **RF-04** | Gestión de Configuración | Permitir al Administrador dar de alta, modificar o eliminar registros de calzados, sucursales, usuarios del sistema y marcas del catálogo. |

### 5.2 Catálogo de calzado y reglas de negocio para tallas

| ID | Nombre | Descripción |
|---|---|---|
| **RF-05** | Catálogo Dinámico | Desplegar el inventario de calzados mediante filtros rápidos por género/categoría, marca, color, precio y disponibilidad de stock real. |
| **RF-06** | Validación Estricta de Tallas | Restringir el ingreso y visualización de tallas de acuerdo con la categoría paramétrica del calzado (ver tabla siguiente). |
| **RF-07** | Gestión de Carrito | Permitir la acumulación de productos en un carrito virtual de compras, la edición de volúmenes por ítem y el desglose de costos antes de confirmar el pedido. |

**Regla de negocio de tallas (RF-06):**

| Categoría | Rango de tallas admitido |
|---|---|
| **Niño** | Única y exclusivamente del **20 al 34** |
| **Juvenil** | Única y exclusivamente del **35 al 39** |
| **Adulto** | Única y exclusivamente del **40 en adelante** |

### 5.3 Flujo de pedidos y modelo de transacción simplificado (Vía Rápida)

| ID | Nombre | Descripción |
|---|---|---|
| **RF-08** | Instrucciones de Pago Offline | Presentar al cliente los datos de las cuentas bancarias institucionales del negocio y un código QR estático oficial al finalizar la orden en el e-commerce. |
| **RF-09** | Carga de Comprobante | Permitir al cliente capturar y adjuntar una imagen/fotografía de su recibo o comprobante de transferencia bancaria directo en la aplicación web. |
| **RF-10** | Parámetros de Despacho | Permitir al comprador optar entre **"Envío a domicilio en Tarija"** (con opción de pago contra entrega en efectivo o QR al repartidor) o **"Retiro en tienda"** en la sucursal de calzado. |

### 5.4 Gestión de inventario

> ℹ️ **Alcance:** el **RF-13** (módulo de traspasos entre tiendas) queda fuera del alcance actual; se mantiene la numeración original del ERS. Ver [Escalabilidad futura](#12-escalabilidad-futura).

| ID | Nombre | Descripción |
|---|---|---|
| **RF-11** | Visibilidad de Stock | Mostrar en la base de datos y paneles internos el stock desglosado por modelo, talla y color de la sucursal de calzado. El modelo de datos se diseña por sucursal para permitir su ampliación futura. |
| **RF-12** | Sincronización Automática | Restar de manera inmediata las unidades de calzado al efectuarse una venta directa en caja o al ser validado manualmente el comprobante de una compra por la web. |
| **RF-14** | Notificación de Quiebre de Stock | Disparar alertas automáticas al Administrador cuando un modelo o talla caiga por debajo de un umbral mínimo de seguridad preestablecido. |

### 5.5 Punto de venta (POS), comprobantes y entregas

> ℹ️ **Alcance:** el proyecto no incluye facturación. Los requerimientos **RF-16** (factura electrónica simulada) y **RF-17** (datos fiscales NIT/CI y Razón Social) quedan fuera del alcance; se mantiene la numeración original del ERS.

| ID | Nombre | Descripción |
|---|---|---|
| **RF-15** | Terminal de Venta en Caja | Proveer a los empleados un módulo POS ágil para procesar ventas presenciales con pagos en efectivo o tarjeta a través de búsquedas por códigos o nombres de calzado. |
| **RF-18** | Comprobante de Venta (no fiscal) | Generar e imprimir/exportar en PDF un comprobante simple de la venta, apto para pantallas y tiqueteras térmicas, con el detalle de la compra y los importes en Bs. No tiene validez como factura. |
| **RF-19** | Cierre de Caja Diario | Permitir a cada empleado realizar el arqueo y balance de caja de la sucursal al término de cada jornada laboral. |
| **RF-20** | Control de Entrega Local | Registrar la salida del pedido web hacia el servicio tercerizado de motomandados en Tarija, almacenando el nombre del repartidor y el estado del despacho. |

### 5.6 Fidelización, analítica avanzada e inteligencia de negocio

| ID | Nombre | Descripción |
|---|---|---|
| **RF-21** | Programa de Fidelidad por Volumen | Contabilizar los pedidos exitosos vinculados al CI o celular del cliente. Al procesarse la décima (10.ª) compra confirmada, el sistema aplicará de manera automática un **5 % de descuento** sobre el importe neto de su siguiente pedido (tanto presencial como online). |
| **RF-22** | Enlace a WhatsApp | Disponer de un botón interactivo para que el empleado envíe una plantilla de mensaje predefinido por WhatsApp al cliente notificándole la confirmación o el estado de retiro de su pedido. |
| **RF-23** | Gráfico de Tendencia Estacional | Desplegar un gráfico de líneas para el Dueño que refleje los patrones de venta mensuales a lo largo del año académico/comercial, visibilizando picos estacionales de demanda (ej. época escolar, festividades). |
| **RF-24** | Predicción de Abastecimiento | Generar recomendaciones sugeridas de compra analizando el histórico de ventas de la temporada anterior, proyectando las cantidades óptimas de calzado y tallas requeridas con un mes de antelación. |
| **RF-25** | Dashboard de Retorno de Inversión | Presentar gráficos de barras comparativos entre el capital invertido en compras a proveedores frente al retorno y utilidades líquidas obtenidas por marca. |
| **RF-26** | Reporte de Rotación de Inventario | Clasificar automáticamente los modelos de calzados en tres cuadrantes (Rotación Alta, Media y Baja), permitiendo identificar los productos estancados ("huesos") para planificar ofertas de liquidación. |
| **RF-27** | Simulador Presupuestario Inteligente | Permitir al dueño simular la distribución de un presupuesto de inversión para nuevas adquisiciones de lotes, sugiriendo porcentajes de compra ideales (Niño, Juvenil, Adulto) fundamentados en el histórico de ventas reales. |

---

## 6. Requerimientos no funcionales (RNF)

### 6.1 Rendimiento, disponibilidad y escalabilidad

| ID | Nombre | Descripción |
|---|---|---|
| **RNF-01** | Disponibilidad del E-commerce | La interfaz pública web debe garantizar una operatividad continua del **99.5 %** del tiempo (24/7). |
| **RNF-02** | Tiempos de Respuesta | Los módulos de catálogo del e-commerce deben procesar y cargar las consultas de calzados en un tiempo menor a **3 segundos** bajo redes móviles promedio en Tarija. |
| **RNF-03** | Soporte de Concurrencia | El sistema debe tolerar un mínimo de **50 usuarios** navegando en simultáneo en la web sin mermar la velocidad de transacción de la caja física. |
| **RNF-04** | Escalabilidad de Infraestructura | El diseño arquitectónico de la base de datos debe ser escalable, permitiendo la integración de nuevas sucursales físicas y nuevas líneas de producto sin alterar el código núcleo. |

### 6.2 Seguridad y control de privacidad

| ID | Nombre | Descripción |
|---|---|---|
| **RNF-05** | Cifrado de Credenciales | Encriptar todas las claves de acceso en el repositorio de datos mediante mecanismos de hash robustos (ej. algoritmos de la familia bcrypt). |
| **RNF-06** | Canales Seguros | La navegación y flujo de datos dentro de la tienda virtual debe realizarse mandatoriamente sobre protocolos seguros HTTPS respaldados por certificados SSL válidos. |
| **RNF-07** | Seguridad basada en Roles | Aplicar políticas estrictas de control de accesos; los empleados de la tienda física tendrán bloqueada por completo la visualización de los paneles de inversión, márgenes de ganancia y métricas gerenciales del dueño. |

### 6.3 Usabilidad, interfaz y localización

| ID | Nombre | Descripción |
|---|---|---|
| **RNF-08** | Enfoque Mobile-First | La capa visual pública de la tienda virtual debe estar optimizada al 100 % para pantallas móviles, priorizando la facilidad de interacción táctil. |
| **RNF-09** | Eficiencia en Caja | El diseño del flujo POS para los empleados debe permitir procesar e imprimir una venta presencial estándar en un máximo de **cuatro (4) clics**. |
| **RNF-10** | Localización Idiomática y Cambiaria | Todo el sistema (módulos, alertas, reportes) operará nativamente en idioma español y procesará importes económicos exclusivamente en Bolivianos (Bs.). |

### 6.4 Conectividad, código y respaldo

| ID | Nombre | Descripción |
|---|---|---|
| **RNF-11** | Interoperabilidad Multi-navegador | Garantizar la compatibilidad visual y lógica de la plataforma en las últimas versiones estables de Google Chrome, Mozilla Firefox, Safari y Microsoft Edge. |
| **RNF-12** | Copias de Seguridad Automatizadas | El sistema debe ejecutar respaldos cronometrados automáticos (backups) de toda la base de datos diariamente, de forma local o en la nube, a la medianoche. |
| **RNF-13** | Tolerancia a Pérdida de Conexión | El sistema debe congelar la operación local e informar inmediatamente al cajero si se detecta una pérdida de conexión a internet, previniendo incoherencias en el inventario. |
| **RNF-14** | Eficiencia en Consumo de Megas | El software debe comprimir automáticamente los archivos de imágenes de calzado subidos por el administrador para optimizar el gasto de datos móviles de los clientes en la ciudad de Tarija. |
| **RNF-15** | Modularidad y Mantenibilidad | El código del sistema e-commerce debe estar lógicamente desacoplado del núcleo de inventario y caja interna, permitiendo efectuar actualizaciones técnicas independientes sin interrumpir el funcionamiento de la tienda física. |

---

## 7. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite (dos aplicaciones: tienda pública y sistema interno) |
| Backend / BaaS | Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) |
| Base de datos | PostgreSQL con Row Level Security (RLS) |
| Autenticación | Supabase Auth (hash de contraseñas gestionado por la plataforma, RNF-05) |
| Gráficos | Recharts |
| Compresión de imágenes | `browser-image-compression` (RNF-14) |

---

## 8. Estructura del repositorio

Monorepo con dos aplicaciones desacopladas, en línea con el RNF-15.

```
sneakers/
├── README.md
├── docs/
│   ├── ERS.md                 # Especificación de requerimientos completa
│   ├── diagramas/             # Casos de uso, clases, ER, secuencia
│   └── manual-usuario/
├── apps/
│   ├── store/                 # E-commerce público (mobile-first)
│   │   └── src/{pages,components,features,hooks}
│   └── admin/                 # POS + paneles de empleado, dueño y administrador
│       └── src/{pages,components,features,hooks}
├── packages/
│   └── shared/                # Cliente Supabase, tipos, utilidades (formato Bs., tallas)
├── supabase/
│   ├── migrations/            # Esquema SQL versionado
│   ├── functions/             # Edge Functions
│   └── seed.sql               # Datos ficticios de prueba
├── .env.example
├── .gitignore
└── package.json               # Workspaces
```

### Reparto de responsabilidades

| Módulo | Requerimientos | Responsable |
|---|---|---|
| Base de datos, Auth, roles y RLS | RF-01 a RF-04, RNF-05 a RNF-07 | Romeo Lancelot Chavez Cuellar |
| Tienda: catálogo, tallas y carrito | RF-05 a RF-07, RNF-08 | Pablo Cesar Maigua Ortiz |
| Pedidos, comprobantes de pago, despacho y WhatsApp | RF-08 a RF-10, RF-20, RF-22 | Samuel Narciso Vilte Tarraga |
| Inventario, POS y cierre de caja | RF-11, RF-12, RF-14, RF-15, RF-19, RNF-09, RNF-13 | Manuel Ignacio Aramayo Hoyos |
| Comprobante de venta, fidelidad y analítica | RF-18, RF-21, RF-23 a RF-27 | Rodrigo Sebastián Guerrero Riera |

### Flujo de trabajo con Git

- Rama `main` protegida; ramas cortas por tarea con el ID del requerimiento, por ejemplo `feat/RF-05-catalogo`.
- Pull request con al menos una revisión de otro integrante antes de mezclar.
- Un issue por requerimiento en GitHub Projects.
- Todo cambio en la base de datos se registra como migración en `supabase/migrations`.

---

## 9. Instalación y ejecución

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

# 4. Ejecutar las aplicaciones
npm run dev --workspace apps/store    # Tienda pública
npm run dev --workspace apps/admin    # Sistema interno
```

> ⚠️ Nunca subir al repositorio la clave `service_role` de Supabase ni el archivo `.env`. En el frontend solo se usa la `anon key`.

---

## 10. Hoja de ruta

- [x] Levantamiento y documentación de requerimientos (ERS)
- [ ] Modelado (casos de uso, diagrama de clases, modelo entidad-relación)
- [ ] Módulo de usuarios, roles y autenticación (RF-01 a RF-04)
- [ ] Catálogo, tallas y carrito (RF-05 a RF-07)
- [ ] Flujo de pedidos y pagos offline (RF-08 a RF-10)
- [ ] Inventario de la sucursal de calzado (RF-11, RF-12, RF-14)
- [ ] POS, comprobante de venta y entregas (RF-15, RF-18 a RF-20)
- [ ] Fidelización y analítica (RF-21 a RF-27)
- [ ] Pruebas, seguridad y despliegue

---

## 11. Uso académico

Este proyecto fue desarrollado con fines **académicos** en la Universidad Privada Domingo Sabio, aplicado al negocio Sneakers de la ciudad de Tarija.

---

## 12. Escalabilidad futura

El sistema está diseñado para crecer más allá de la sucursal de calzado. El negocio cuenta con **otras dos sucursales de ropa en Tarija**, y la arquitectura permite integrarlas en una etapa posterior sin alterar el código núcleo (RNF-04 y RNF-15). La ampliación contemplaría:

- Stock segmentado por tienda (extensión del RF-11).
- Módulo de traspasos entre sucursales (RF-13).
- Matriz de tallas y categorías propias para ropa.
- Paneles analíticos consolidados por sucursal para el dueño.
