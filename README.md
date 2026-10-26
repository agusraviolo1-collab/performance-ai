# Performance AI

Aplicación personal para editar el plan semanal y las rutinas, registrar actividades por rutina, agregar deportes y revisar cargas.

## Uso

Abrir https://agusraviolo1-collab.github.io/performance-ai/ . Los datos se guardan en cada navegador y no se sincronizan. La versión 6 migra los registros `pa_pilot_v4` a `pa_v6` y conserva intacta la copia anterior. Los cambios solo se anuncian como guardados cuando localStorage confirma la escritura.

- **Mi plan:** editar y mover actividades entre días; crear, editar, ordenar y eliminar rutinas y ejercicios. Deshacer recupera el estado anterior al último cambio del plan. Al eliminar una rutina se conserva el nombre de la actividad programada y el historial registrado.
- **Entrenar:** elegir deporte y rutina. El registro conserva el nombre de la rutina al momento del entrenamiento.
- **Deportes y datos:** agregar nombres de deportes. No se puede desactivar el último deporte ni uno todavía vinculado al plan o rutinas.

## Importar entrenamientos

CSV/TXT con encabezados `rutina,deporte,ejercicio,series,repeticiones`, o `ejercicio,detalle`; admite separador coma o punto y coma, comillas y saltos de línea dentro de campos entrecomillados. Rutina y deporte son opcionales; por defecto se usa Rutina importada / Gimnasio. Ejemplo:

```csv
rutina,deporte,ejercicio,series,repeticiones
Piernas,Gimnasio,Sentadilla,3,8
Piernas,Gimnasio,Hip thrust,3,10
```

JSON: `{"routines":[{"title":"Piernas","sport":"Gimnasio","ex":[["Sentadilla","3 × 8"]]}]}`. También admite un respaldo V6 que contenga `data.routines`. Máximo 2 MB, 100 rutinas, 150 ejercicios por rutina. Primero se valida todo el archivo. Si hay un error, no cambia nada.

La vista previa permite **agregar** (nombres duplicados reciben un número) o **reemplazar todas las rutinas**. Reemplazar pide confirmación, conserva actividades, marcas y el calendario, y desvincula las rutinas anteriores de las actividades programadas. Las nuevas rutinas se vinculan desde Mi plan. Se conserva una copia deshacible del plan anterior. Cancelar no guarda cambios. Excel debe exportarse como CSV; el reconocimiento automático de imágenes no está implementado.

**Restaurar respaldo** es un flujo distinto: valida y pide confirmación antes de reemplazar TODOS los datos locales. Exportar no incluye credenciales del Coach. Los respaldos de V5 sin rutinas usan el plan base original al restaurarse.

## Activar el Coach de IA (pendiente de servicio y credenciales)

GitHub Pages publica archivos estáticos; `server.mjs` debe desplegarse en un servicio con Node.js 22 o superior y HTTPS. No hay proveedor activado por defecto ni respuestas simuladas. El servidor usa la API Responses de OpenAI, según https://developers.openai.com/api/docs/quickstart .

1. Crear una cuenta API y configurar facturación y un límite de gasto en el proveedor. Una suscripción a un chat no configura este servidor.
2. Desplegar `server.mjs`, `index.html`, `base.mjs`, `core.mjs`, `app.mjs`, `style.css` y `editor.css` juntos en un servicio Node. Comando de inicio: `node server.mjs`.
3. Configurar secretos del servidor: `OPENAI_API_KEY`, `OPENAI_MODEL` (un modelo disponible en la cuenta), `COACH_ACCESS_TOKEN` (código aleatorio largo). Configurar `ALLOWED_ORIGINS=https://agusraviolo1-collab.github.io` y el `PORT` del alojamiento. `.env.example` solo documenta variables; no se carga automáticamente.
4. En Coach IA → Configurar conexión, ingresar `https://tu-servicio/api/coach` y el código `COACH_ACCESS_TOKEN`. No ingresar la clave OpenAI en el navegador ni en GitHub. El código queda en memoria solo durante la pestaña; la dirección se guarda localmente.
5. Enviar una consulta. El usuario puede incluir el plan y un resumen de las últimas 20 actividades. Por defecto no se envían datos de entrenamiento. No se envían notas personales ni marcas. El historial de conversación de esta pestaña se mantiene mientras esté abierta. No modifica el plan automáticamente.

El servidor exige código de acceso, limita a 10 consultas por minuto por proceso, restringe orígenes, limita el tamaño de entrada, pide al proveedor no almacenar la respuesta (`store:false`) y devuelve errores sin claves. Para uso por varias personas se necesita autenticación individual y límites distribuidos. Sin secretos responde 503; no se afirma conexión activa hasta verificar una respuesta real del proveedor.

## Verificación

`node --test core.test.mjs server.test.mjs` comprueba migración, importación, conservación del historial, restauración, errores de almacenamiento y contrato del servidor con un proveedor simulado. Las pruebas simuladas no acreditan una conexión real a OpenAI. La navegación y persistencia se verifican también en navegador antes de publicar.

## Informes mensuales (interfaz V7, datos V6 compatibles)

En Progreso, elegir mes y deporte. El informe muestra sesiones, minutos, días con registros, carga estimada, promedio de RPE por sesión, gráficos por semana y deporte, tendencia de seis meses, rutinas realizadas, marcas del mes y detalle de actividades. Hay exportación CSV e impresión con gráficos para guardar como PDF mediante el navegador. No se envían datos a un servidor para generar informes.

La comparación de un mes en curso usa el mismo tramo del mes anterior, limitado a los días disponibles de ese mes. Meses históricos comparan meses completos y se aclara que pueden tener distintas duraciones. Los registros con fecha futura no entran en los totales realizados. Días sin registros no se clasifican como descanso. No se calcula cumplimiento, calorías, volumen de pesas ni riesgo de lesión. Los registros antiguos sin rutina quedan identificados; los nombres históricos no se reemplazan por los del plan actual. Las marcas solo aparecen al elegir Todos los deportes, porque no tienen deporte asociado.

Las pruebas adicionales se ejecutan con `node --test reports.test.mjs`. Verifican límites de fechas, años bisiestos, comparación de meses parciales, agrupación de rutinas, ausencia de cambios en datos originales, filtros y exportación CSV. `server.mjs` también sirve `reports.mjs`, `report-view.mjs` y `reports.css` al alojar la app fuera de GitHub Pages.

## Compartir planificación y planear cargas (interfaz V8)

En Mi plan → Editar / mover se pueden indicar duración prevista (1–600 min), esfuerzo RPE previsto (1–10) y descanso/sin sesión. Los valores son opcionales y se conservan en los respaldos. Una carga sin ambos datos queda pendiente; los totales se identifican como parciales. Marcar descanso elimina la previsión de carga de esa actividad. Estos valores no se copian al historial de sesiones realizadas ni se usan como recomendaciones automáticas.

Mi plan → Compartir planificación abre una vista previa. Permite elegir el lunes de una semana propuesta, añadir un comentario para el entrenador, incluir u omitir la biblioteca de rutinas y, por elección explícita en cada apertura, incluir un resumen de carga real de los últimos 28 días. El resumen usa cuatro tramos de siete días hasta la fecha de creación; no incluye notas de sesiones, marcas ni credenciales. No se atribuye descanso a períodos sin registros. La semana elegida es una proyección de la estructura actual, no un calendario histórico.

Se puede compartir mediante el menú del dispositivo (Web Share API, si está disponible), copiar texto, descargar TXT o una ficha HTML autocontenida, exportar un CSV para planear cargas o imprimir/guardar PDF desde el navegador. El CSV contiene una fila por actividad para evitar duplicar duración/carga por cada ejercicio. La ficha HTML no ejecuta scripts ni carga recursos externos. El menú nativo se invoca directamente desde el clic; si no se ofrece compartir, se mantienen las opciones de copia y descarga. No se da por confirmada la entrega al destinatario.

Los archivos se generan localmente: no se publica el plan del usuario en GitHub ni se crea un enlace público. No se envían mensajes automáticamente. Las copias del entrenador no se sincronizan con la app; los cambios acordados se aplican desde los editores. Pruebas adicionales: `node --test plan-share.test.mjs`.

## App vacía, intercambio de rutinas y escala RPE (interfaz V9)

Un navegador nuevo, sin datos V6 ni registros V5, comienza con las rutinas, el calendario, las actividades y las marcas vacías. Los datos V6 existentes y la migración V5 se conservan. La biblioteca original solo se usa como compatibilidad de respaldos y migraciones anteriores; no se precarga para usuarios nuevos. Las posturas de yoga y la nota del plan original no se muestran en una instalación vacía.

Deportes y datos → Compartir la app vacía permite copiar o compartir `https://agusraviolo1-collab.github.io/performance-ai/?inicio=limpio`. El enlace no incluye datos del usuario y **no borra datos de un navegador que ya usaba la app**. Cada persona conserva su propia información local; no hay cuentas ni sincronización entre dispositivos.

En Mi plan, cada rutina tiene Compartir rutina. Se puede copiar o compartir un enlace que contiene únicamente nombre, deporte, indicaciones y ejercicios de esa rutina, o descargar un JSON compatible con Importar entrenamientos. Los datos de la rutina van en el fragmento del enlace (`#rutina=…`), sin publicar un archivo individual en un servidor. Cualquiera con ese enlace puede leer la rutina. El contenido no incluye calendario, historial, marcas, IDs ni credenciales.

La otra persona abre el enlace, revisa la vista previa en Deportes y datos y elige agregar o reemplazar mediante el flujo de importación existente. Nunca se guarda automáticamente. El fragmento se retira de la barra después de preparar la vista previa para evitar repetirla al recargar. Los enlaces tienen un límite de 8000 caracteres; para rutinas mayores se ofrece JSON. Las copias no se actualizan cuando cambia la rutina original.

Entrenar incluye botones RPE de 1 a 10, descripciones de referencia y un campo numérico sincronizado que sigue admitiendo incrementos de 0,5. Los puntos de referencia son 1 muy suave, 2 suave, 3 moderado, 4 algo duro, 5 duro, 7 muy duro y 10 máximo; los intermedios se indican como tales. Se valora la sesión completa, no las repeticiones en reserva de una serie. Referencia: https://www.world.rugby/the-game/player-welfare/medical/player-load/coaches-guidance?lang=en (apéndice RPE). No se transforma el esfuerzo previsto en esfuerzo real automáticamente.

Pruebas adicionales: `node --test routine-exchange.test.mjs`. La recepción de enlaces, importación con confirmación, conservación de datos y selección RPE se comprueban también en navegador. El envío nativo a una aplicación destinataria concreta debe comprobarse en el dispositivo real; las pruebas no envían mensajes a personas.

## Ficha simple, PDF directo y registro local (V10)

La ficha del entrenador (vista previa, texto, HTML, CSV y PDF) muestra días, actividades y rutinas, sin duración prevista, RPE previsto ni totales de carga prevista. Los campos de previsión siguen disponibles para uso dentro del plan. El resumen de carga real reciente continúa siendo opcional y está desmarcado por defecto.

Descargar PDF genera un archivo PDF real en el navegador, mediante la copia local de pdf-lib (licencia MIT en vendor/pdf-lib.LICENSE.md). No usa window.print ni depende de imprimir desde un diálogo. Incluye paginación, ajuste de líneas, gráficos vectoriales en informes mensuales y mensajes de progreso/error. Después de generarlo ofrece también un enlace Guardar PDF generado por si el navegador bloquea la descarga automática. No requiere servicio externo. Los caracteres no disponibles en la fuente del PDF se sustituyen por ? con una nota, para evitar errores de codificación. Se revisan PDFs renderizados y las descargas reales en navegador; falta verificar el comportamiento de descarga en un iPhone físico.

Al abrir una instalación sin perfil se solicita nombre, fecha de nacimiento, peso en kg y altura en cm. No se requieren correo ni contraseña. Es un perfil local, no autenticación ni una cuenta sincronizada. Se valida fecha no futura y valores numéricos; se puede editar en Deportes y datos → Mi perfil. Los datos anteriores de entrenamiento se conservan. Un respaldo completo incluye el perfil y debe guardarse como archivo personal; las fichas del entrenador, enlaces de app/rutina y consultas del Coach no lo incluyen automáticamente. Al restaurar un respaldo antiguo sin campo profile se conserva el perfil actual.

Pruebas: `node --test *.test.mjs`, incluyendo profile-pdf.test.mjs. Los datos ficticios usados para QA de PDF no se incorporan a la app publicada.

## Reordenar y editar rutinas (V11)

Rutinas y ejercicios tienen asas ⠿ para reordenar por arrastre. Las asas usan Pointer Events y touch-action:none para separar el gesto del desplazamiento de la página. También se pueden enfocar y mover con flechas arriba/abajo. Las listas guardadas se persisten al soltar y admiten Deshacer; el editor mantiene sus cambios como borrador hasta Guardar rutina. El gesto no mueve ejercicios entre rutinas diferentes.

El editor separa nombre, series, repeticiones/rango y objetivo de esfuerzo: sin objetivo, RIR 0, 1, 2, 3 o fallo. Se permiten series con objetivo RIR/fallo sin fijar repeticiones. RIR por serie se diferencia de la escala RPE global del registro. Para tiempos, escaleras y otros formatos se conserva Detalle libre. Los ejercicios antiguos no se reinterpretan sin guardar; los formatos conocidos se precargan y los ambiguos quedan como texto.

Los ejercicios conservan los dos primeros valores `[nombre, detalle]` para compatibilidad y pueden añadir un tercer objeto de prescripción estructurada. Normalizar, respaldar e intercambiar rutinas conserva ese objeto y genera un detalle legible para PDF/texto. Pruebas: exercise-data.test.mjs. La barra inferior duplicada se quitó: en móvil queda la navegación superior.

Apple Health no está conectado en esta web. Leer pasos mediante HealthKit requiere una app/puente nativo y autorización del usuario para ese tipo de dato. No se muestran pasos simulados ni se pide un permiso de HealthKit desde Safari. Esa integración queda para una versión de iOS, fuera de estos cambios web.


V12: acceso a editar perfil junto a la versión. Preferencias de recordatorios locales: hora, días, aviso tras 2/3/5/7/14 días sin registros y ocultar por hoy. Se muestran al abrir o mantener visible la app; no hay push ni solicitud de permiso ficticia. Exportación ICS RFC 5545 con 8 repeticiones por día del plan, alarma y UID estable; excluye descansos, perfil e historial. El usuario importa el calendario y revisa alertas; no se sincroniza y debe retirar eventos anteriores si cambia el plan. Para push cerrado en iPhone hace falta un servicio de envío/programación, suscripción explícita y PWA instalada.

V13: Mi plan muestra primero los siete días en filas desplegables compactas; conserva la apertura al guardar cambios. Compartir y revisar cargas queda debajo de las rutinas. Las rutinas cerradas muestran título, deporte, cantidad de ejercicios y asa en una sola cabecera; las acciones están dentro. Modo Ordenar pliega las rutinas y permite mover desde asas de 44 px, con umbral de arrastre, posición de destino visible y alternativa por teclado.

V14: enfoques General, Fútbol y Triatlón persistidos, sin reemplazar rutinas ni registros. Inicio con objetivo por enfoque, calendario real de hoy, cumplimiento explícito por vínculo y sensaciones diarias. Semanas fechadas (la semana legacy se asigna a la semana actual al migrar), archivo de hasta 156 semanas y copia explícita a semanas vacías. Registro con edición, vínculo al plan completo/parcial; tramos de natación/bici/carrera con distancias y sensores opcionales, sesión combinada contabilizada una vez; fútbol con tipo, formato, participación y minutos jugados. Informes deportivos por mes y CSV, sin atribuir partidos a registros antiguos. El informe PDF completo y la ficha simple siguen disponibles. Objetivos y sensaciones son locales; no se incluyen en rutinas compartidas. Los recordatorios fechados no repiten planes en semanas que no fueron programadas. IA, HealthKit y push siguen pendientes de servicio.

V15: el enfoque se configura únicamente desde Deportes y datos. Se retiraron el selector global, el selector del perfil y la grilla Mis deportes; agregar un deporte personalizado sigue disponible desde el registro. Mi plan tiene acción Agregar en la cabecera, opciones de semana plegables y estilos móviles para navegación de cinco pestañas, fechas, filas de días, rutinas y asas táctiles. No modifica historial, rutinas ni preferencias guardadas.
