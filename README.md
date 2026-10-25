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
