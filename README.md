# RutaClara (prototipo)

Prototipo funcional de una plataforma web para el gremio del transporte especial
(placa blanca) en Colombia: cotizador público instantáneo + tablero de servicios
con reputación bilateral. Construido para mostrarle la idea a transportadores
reales, no para producción.

## Cómo correr el proyecto

Requiere [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El 90% del tráfico real
llegaría desde el celular vía WhatsApp, así que pruébalo también con las
herramientas de emulación móvil del navegador o desde tu propio teléfono en la
misma red (`npm run dev -- -H 0.0.0.0` y entra a la IP de tu computador).

```bash
npm run build   # build de producción
npm run start   # sirve el build de producción
```

## Estructura

```
app/
  page.tsx            → Cotizador público (/)
  tablero/page.tsx     → Tablero de servicios (/tablero)
  perfil/page.tsx      → Perfil del transportador (/perfil)
lib/
  tipos.ts             → Interfaces TypeScript de todo el dominio
  tarifas.ts           → Motor de cotización (funciones puras)
  distancias.ts        → Servicio de rutas/distancias, abstraído
  festivos.ts          → Calculadora de festivos colombianos (Ley Emiliani + Pascua)
  eventos.ts           → Búsqueda de eventos/temporada alta por ciudad y fecha
  whatsapp.ts          → Generación de mensajes y links de WhatsApp
  iconos.ts            → Íconos (emoji) por tipología
data/
  servicios.json        → Servicios demo del tablero
  publicadores.json     → Publicadores demo con su reputación
  transportador-demo.json → Transportador demo para /perfil
  beneficios.json        → Beneficios de afiliado demo
  eventos.json           → Eventos/temporada alta demo (ferias, carnavales)
components/
  TarjetaServicio, InsigniaPagador, SemaforoDocumento,
  DesgloseCotizacion, SelectorTipologia, FormularioPublicarServicio,
  VistaTransportador, VistaPublicador, NavInferior, SelectorModoDemo,
  ModoDemoContext (rol demo: publicador / transportador)
```

## El motor de tarifas, explicado

Todo vive en `lib/tarifas.ts`, como funciones puras (mismo input → mismo
output, sin efectos secundarios) para que sean fáciles de testear.

1. **Tramo de distancia.** La tarifa por km es degresiva (a mayor distancia,
   menor $/km). Hay 4 tramos: `0-50km`, `50-150km`, `150-400km`, `+400km`. El
   tramo se determina con el **km de ida**, nunca con el total — así cotiza
   el mercado hoy. Ver `obtenerTramo()`.

2. **Subtotal por distancia.** `subtotalKm = km_ida × $/km del tramo`. El
   vehículo sí recorre ida y vuelta (`kmTotales = km_ida × 2`), pero el
   listado de $/km del gremio ya está pensado sobre el km de ida — por eso el
   cálculo de dinero usa solo `km_ida`. `kmTotales` se muestra en el desglose
   como referencia, no participa en el cálculo del subtotal.

3. **Peajes.** Se cobran ida y regreso: `peaje_ida × 2`. Para buseta, busetón
   y bus el peaje base se multiplica ×1.8 antes de duplicarlo (pagan más eje
   en las casetas). Ver `peajeParaTipologia()`.

4. **Recargos**, todos calculados sobre el subtotal por distancia (no sobre
   los peajes, que son un costo de paso fijo) y **acumulables entre sí** —
   un servicio nocturno, en festivo y en plena Feria de las Flores suma los
   tres:
   - **Nocturno (30%).** Hora de inicio entre las 8:00 p.m. y las 6:00 a.m.
     (`esHorarioNocturno()` en `lib/tarifas.ts`).
   - **Fin de semana / festivo (20%).** Sábado, domingo, o festivo
     colombiano — mayor demanda, menos vehículos disponibles
     (`RECARGO_FIN_DE_SEMANA_FESTIVO`). Los festivos se calculan
     algorítmicamente en `lib/festivos.ts` (fijos + Ley Emiliani + Semana
     Santa vía el algoritmo de la Pascua), no es una lista fija por año, así
     que funciona para cualquier fecha sin mantenimiento.
   - **Evento / temporada alta (variable por evento).** Si el origen o el
     destino tienen una feria o fiesta conocida activa esos días (Feria de
     las Flores, Feria de Cali, Carnaval de Barranquilla, etc.), se suma el
     recargo propio de ese evento. Datos demo en `data/eventos.json`,
     búsqueda en `lib/eventos.ts` (`buscarEventoAplicable()`).

   El cotizador avisa de estos recargos apenas eliges la fecha, antes de
   cotizar, para que nunca sea una sorpresa en el desglose.

5. **Tarifa mínima.** Si `subtotal + peajes + recargos` da menos que la
   tarifa mínima de la tipología, se usa la mínima. Evita cotizaciones
   absurdas en trayectos muy cortos.

6. **Redondeo.** El total final se redondea al múltiplo de $1.000 más
   cercano (`redondearMil()`).

Todos los valores de $/km, tarifas mínimas y rutas (km + peaje) son datos
reales del gremio en Antioquia, 2026, cargados en `lib/tarifas.ts` y
`lib/distancias.ts`.

## Qué está simulado (y cómo conectar lo real después)

| Qué | Hoy (prototipo) | Cómo conectar lo real |
|---|---|---|
| **Distancias y peajes** | Tabla precargada de 29 rutas desde Medellín en `lib/distancias.ts`, con búsqueda exacta por nombre de municipio. Si el destino no está, el cotizador ofrece ingresar el km manualmente. | Reemplazar el cuerpo de `obtenerDistancia()` en `lib/distancias.ts` por una llamada a Google Routes API (`routes.googleapis.com/directions/v2:computeRoutes`). La firma de la función no cambia, así que ningún componente que la use necesita tocarse. Vale la pena cachear resultados: las rutas no cambian de un día para otro. |
| **Base de datos** | Los "servicios", "publicadores" y el "transportador demo" viven en archivos JSON (`data/`) cargados en memoria; los cambios (publicar un servicio, tomarlo) solo persisten mientras la pestaña esté abierta. | Los tipos en `lib/tipos.ts` ya están pensados como la forma de una respuesta de API — migrar a una base de datos real (Postgres, etc.) más un backend (Next.js Route Handlers o un servicio aparte) implica reemplazar los `useState` inicializados desde JSON por `fetch`/`SWR`/`React Query` contra esos endpoints. |
| **Autenticación** | No hay login. Un selector de "modo demo" (`components/ModoDemoContext.tsx`) guarda en `localStorage` si estás viendo la app como Publicador o Transportador, usando siempre el mismo publicador/transportador de ejemplo (`pub-1` / `trans-demo`). | Reemplazar por autenticación real (ej. NextAuth, Clerk, o un backend propio con JWT) y usar el usuario autenticado en vez de los IDs fijos `PUBLICADOR_DEMO_ID` / `TRANSPORTADOR_DEMO_ID`. |
| **Pagos y garantía contra no-pago** | Solo se muestra la insignia de reputación (`InsigniaPagador`) y la etiqueta "Pago asegurado disponible" para publicadores nuevos — no hay flujo de pago real. | Integrar una pasarela de pagos (o un flujo de retención/escrow) que libere el pago al transportador cuando el publicador confirme el servicio completado. |
| **Eventos / temporada alta** | Lista fija de 5 eventos ilustrativos en `data/eventos.json` (Feria de las Flores, Feria de Cali, Carnaval de Barranquilla, Feria de Manizales, Alumbrados) con fechas de 2026. | Reemplazar por una fuente mantenida (agenda cultural de cada alcaldía, o un calendario propio del gremio actualizado cada año), respetando la forma de `EventoCiudad` en `lib/tipos.ts`. |
| **Notificación por WhatsApp** | Los botones "Compartir por WhatsApp" abren `wa.me` con el texto precargado — el usuario debe darle enviar manualmente. | Para notificaciones automáticas (sin acción del usuario) se necesitaría la API de WhatsApp Business (Meta Cloud API o Twilio). |
| **Verificación de documentos (semáforo)** | Datos fijos en `data/transportador-demo.json`. | Conectar con el registro real de pólizas/SOAT/tarjeta de operación (manual al inicio, o vía un proveedor de verificación documental) y calcular `diasRestantes` desde la fecha de vencimiento real. |

## Principios de diseño que se respetaron

- Máximo 2 toques para tomar un servicio (tarjeta → confirmar).
- Botones de mínimo 56px de alto (`.btn-grande` en `app/globals.css`).
- Colores semafóricos consistentes: verde = plata/ok, amarillo = atención,
  rojo = problema, naranja = acción rápida/urgencia, azul = acción general.
- Navegación inferior fija con 3 íconos, sin menú hamburguesa.
- Todo el texto en español colombiano, botones en mayúsculas con el lenguaje
  del gremio ("TOMAR SERVICIO", "PUBLICAR SERVICIO", "PAPELES AL DÍA").
- Formato de moneda `$1.250.000` (puntos de miles, sin decimales) vía
  `formatoMoneda()` en `lib/tarifas.ts`.
