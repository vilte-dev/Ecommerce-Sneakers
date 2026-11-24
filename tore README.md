[1mdiff --git a/README.md b/README.md[m
[1mdeleted file mode 100644[m
[1mindex 5d38585..0000000[m
[1m--- a/README.md[m
[1m+++ /dev/null[m
[36m@@ -1,347 +0,0 @@[m
[31m-# 👟 Sneakers — Sistema Omnicanal de E-commerce y Gestión Comercial de Calzado[m
[31m-[m
[31m-> Proyecto académico universitario aplicado a **Sneakers**, un negocio real de calzado en la ciudad de Tarija, Bolivia.[m
[31m-[m
[31m-![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)[m
[31m-![Tipo](https://img.shields.io/badge/tipo-proyecto%20acad%C3%A9mico-blue)[m
[31m-![Documentaci%C3%B3n](https://img.shields.io/badge/docs-ISO%2FIEC%2FIEEE%2029148-green)[m
[31m-[m
[31m----[m
[31m-[m
[31m-## 📑 Tabla de contenidos[m
[31m-[m
[31m-1. [Introducción y contexto del negocio](#1-introducción-y-contexto-del-negocio)[m
[31m-2. [Equipo del proyecto](#2-equipo-del-proyecto)[m
[31m-3. [Marco normativo y restricciones de diseño](#3-marco-normativo-y-restricciones-de-diseño)[m
[31m-4. [Actores del sistema](#4-actores-del-sistema)[m
[31m-5. [Requerimientos funcionales](#5-requerimientos-funcionales-rf)[m
[31m-6. [Requerimientos no funcionales](#6-requerimientos-no-funcionales-rnf)[m
[31m-7. [Tecnologías](#7-tecnologías)[m
[31m-8. [Estructura del repositorio](#8-estructura-del-repositorio)[m
[31m-9. [Instalación y ejecución](#9-instalación-y-ejecución)[m
[31m-10. [Hoja de ruta](#10-hoja-de-ruta)[m
[31m-11. [Uso académico](#11-uso-académico)[m
[31m-12. [Escalabilidad futura](#12-escalabilidad-futura)[m
[31m-[m
[31m----[m
[31m-[m
[31m-## 1. Introducción y contexto del negocio[m
[31m-[m
[31m-El presente proyecto comprende el diseño y desarrollo de una plataforma informática para la gestión comercial de **Sneakers**, un negocio de calzado ubicado en la ciudad de Tarija. El modelo operativo actual del negocio se caracteriza por una estructura compacta y eficiente:[m
[31m-[m
[31m-| Componente | Descripción |[m
[31m-|---|---|[m
[31m-| **Infraestructura física** | Una (1) sucursal comercial de calzado ubicada en la ciudad de Tarija. |[m
[31m-| **Capital humano** | Un (1) operario multifuncional, encargado tanto de la atención presencial como de la preparación de despachos digitales. |[m
[31m-| **Nivel directivo** | El Dueño/Socio del negocio, responsable de la supervisión, análisis financiero y toma de decisiones operativas. |[m
[31m-[m
[31m-La solución tecnológica integra un canal de comercio electrónico (**E-commerce**) y un sistema interno de gestión para:[m
[31m-[m
[31m-- Centralizar el control de inventarios.[m
[31m-- Automatizar los flujos de trabajo omnicanal.[m
[31m-- Dotar al negocio de herramientas analíticas para la planificación estacional de inversiones en mercadería.[m
[31m-[m
[31m-### Alcance del proyecto[m
[31m-[m
[31m-**El sistema incluye:**[m
[31m-[m
[31m-- Tienda virtual (e-commerce) con catálogo, filtros, tallas y carrito de compras.[m
[31m-- Pedidos con pago offline (transferencia o QR) y validación manual del comprobante.[m
[31m-- Despacho a domicilio en Tarija o retiro en tienda.[m
[31m-- Control de inventario con alertas de stock mínimo.[m
[31m-- Punto de venta (POS), comprobante de venta y cierre de caja diario.[m
[31m-- Programa de fidelidad por volumen de compras.[m
[31m-- Paneles analíticos para el dueño: tendencias estacionales, rotación, retorno de inversión y simulador presupuestario.[m
[31m-[m
[31m-**El sistema NO incluye:**[m
[31m-[m
[31m-- Facturación electrónica ni integración con el Servicio de Impuestos Nacionales (SIN).[m
[31m-- Pasarela de pagos en línea: el pago es offline y lo valida manualmente el empleado.[m
[31m-- Procesamiento de pagos con tarjeta: el sistema solo registra la venta, no se conecta con terminales bancarias.[m
[31m-- Envío automático de mensajes por WhatsApp: el empleado envía la plantilla mediante un botón.[m
[31m-- Integración con el servicio de motomandados: solo se registra el repartidor y el estado del despacho.[m
[31m-- Envíos fuera de la ciudad de Tarija.[m
[31m-- Aplicación móvil nativa: la tienda es web y mobile-first.[m
[31m-- Contabilidad completa, planillas ni gestión de recursos humanos.[m
[31m-- Gestión de múltiples sucursales ni de productos distintos al calzado (ver [Escalabilidad futura](#12-escalabilidad-futura)).[m
[31m-[m
[31m----[m
[31m-[m
[31m-## 2. Equipo del proyecto[m
[31m-[m
[31m-| Integrante | Rol en el proyecto | Correo |[m
[31m-|---|---|---|[m
[31m-| Romeo Lancelot Chavez Cuellar | Base de datos, seguridad y roles (líder técnico) | tj.romeo.chavez.c@upds.net.bo |[m
[31m-| Pablo Cesar Maigua Ortiz | Tienda virtual: catálogo, tallas y carrito | pcmaiguaortiz@gmail.com |[m
[31m-| Samuel Narciso Vilte Tarraga | Pedidos, comprobantes de pago y entregas | samuelvilte64@gmail.com |[m
[31m-| Manuel Ignacio Aramayo Hoyos | Inventario y punto de venta (POS) | aramayomanuel2@gmail.com |[m
[31m-| Rodrigo Sebastián Guerrero Riera | Fidelización y analítica del negocio | guerrerorierarodrigosebastian@gmail.com |[m
[31m-[m
[31m-**Información académica**[m
[31m-[m
[31m-- **Universidad:** Universidad Privada Domingo Sabio[m
[31m-- **Carrera:** Ingeniería de Sistemas[m
[31m-- **Materia:** Desarrollo de Sistemas II[m
[31m-- **Docente:** Ing. Eddy Roger Calderón Caquiva[m
[31m-- **Gestión:** 2026[m
[31m-[m
[31m----[m
[31m-[m
[31m-## 3. Marco normativo y restricciones de diseño[m
[31m-[m
[31m-Para garantizar el cumplimiento legal y los estándares internacionales de ingeniería de software exigidos en el ámbito universitario, el sistema se rige bajo los siguientes marcos.[m
[31m-[m
[31m-### 3.1 Normativa legal y regulatoria (Bolivia)[m
[31m-[m
[31m-| Norma | Aplicación en el proyecto |[m
[31m-|---|---|[m
[31m-| **Ley Nº 164** (Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación) | Valida legalmente la celebración de transacciones mediante comercio electrónico y el uso del carrito de compras en el territorio boliviano. |[m
[31m-| **Código de Comercio de Bolivia** (Artículos sobre Contabilidad y Libros de Comercio) | Regula la obligatoriedad de registrar los ingresos de forma cronológica, justificando el diseño de los cierres de caja y el almacenamiento seguro del historial de transacciones para auditorías. |[m
[31m-| **Ley Nº 453** (Ley General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores) | Exige total transparencia en la visualización de precios en moneda nacional (Bolivianos - Bs.), además de la inclusión explícita de términos de servicio y políticas claras para cambios de calzado o devoluciones. |[m
[31m-| **Constitución Política del Estado (Art. 130 – Acción de Protección de Privacidad)** | Respalda el cuidado de los datos personales de los clientes (correo, WhatsApp, CI o celular) que el sistema registra, justificando el cifrado de credenciales y el control de accesos por rol. |[m
[31m-| **Decreto Supremo Nº 1793** (Reglamento de la Ley Nº 164) | Complementa la Ley 164 y constituye el marco general de protección de datos personales en el ámbito de las TIC. |[m
[31m-[m
[31m-### 3.2 Estándares tecnológicos y de calidad de software[m
[31m-[m
[31m-| Estándar | Aplicación en el proyecto |[m
[31m-|---|---|[m
[31m-| **ISO/IEC/IEEE 29148** (sucesora de IEEE 830) | Estructura metodológica empleada para la elaboración del documento de requerimientos, asegurando la correcta separación y especificación de requerimientos funcionales y no funcionales. |[m
[31m-| **ISO/IEC 25010** (Quality Product Model) | Marco de referencia para establecer los parámetros de calidad del software, con énfasis en eficiencia de desempeño (tiempos de carga), seguridad (cifrado de datos), usabilidad (diseño responsive) y fiabilidad. |[m
[31m-| **ISO 9407** (Shoe sizes – Mondopoint system) | Referencia conceptual para estructurar de manera organizada la matriz de tallas en la base de datos (Niño, Juvenil, Adulto). |[m
[31m-[m
[31m----