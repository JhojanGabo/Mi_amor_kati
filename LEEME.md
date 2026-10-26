# Kate · un pequeño universo — guía rápida

## Qué contiene la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la página |
| `style.css` | Diseño (colores, tipografías, animaciones) |
| `config.js` | **Todo lo que puedes editar**: tu nombre, mensajes y enlaces de música |
| `effects.js` | Cielo estrellado, partículas, corazones al tocar, celebración |
| `audio.js` | Música ambiental opcional (generada en el navegador, sin archivos) |
| `script.js` | Lógica de las escenas |

---

## 1. Antes de nada: tu nombre (obligatorio)

Abre `config.js` con el Bloc de notas (o cualquier editor) y cambia:

```js
fromName: "TU NOMBRE",
```

por tu nombre. Mientras diga "TU NOMBRE", la página muestra un aviso amarillo de "Modo prueba" para que no se te pase.

Ahí mismo puedes cambiar cualquier mensaje. Puedes usar `{her}` (nombre de ella) y `{from}` (el tuyo).

## 2. La canción “Ameri” (importante)

No pude verificar un enlace oficial exacto de la canción, así que **no inventé ninguno**. Por defecto, los botones de YouTube y Spotify abren una búsqueda real de "Duki Ameri".

Para que suene **dentro de la página**:

1. Abre en YouTube el video oficial de Ameri (canal oficial de Duki).
2. Copia el código que va después de `watch?v=` (son 11 caracteres).
3. Pégalo en `config.js`: `youtubeId: "AQUI_EL_CODIGO"`.

Notas:
- Solo suena cuando ella pulsa el botón. Nunca se reproduce solo.
- Algunos videos no permiten incrustarse. Si pasa, el propio reproductor mostrará "Ver en YouTube" y los chips de YouTube/Spotify siguen funcionando.
- Si dejas `youtubeId` vacío, el botón abre YouTube en otra pestaña (funciona igual de bien).

## 3. Probarla en tu computadora

- **Lo más fácil:** doble clic en `index.html`.
- Recarga la página (F5) cada vez que cambies `config.js`.
- Prueba con el modo celular: en Chrome pulsa F12 → icono de móvil.

## 4. Probarla en tu celular (antes de enviarla)

La mejor prueba es publicarla (paso 5) y abrir el enlace en tu teléfono. Haz el recorrido completo, incluidos los dos botones de la pregunta, y revisa que el sonido del botón ♪ y de la canción funcionen.

## 5. Publicarla gratis y compartir un enlace

### Opción A — Netlify Drop (la más rápida, sin código)
1. Entra a **app.netlify.com/drop**.
2. Arrastra **la carpeta completa** `kate-universo` (o el `.zip` si te lo permite).
3. En unos segundos te da un enlace tipo `https://algo-aleatorio.netlify.app`.
4. Si te pide crear una cuenta gratis para que el sitio no caduque, hazlo: es rápido.
5. Opcional: en *Site configuration → Change site name* pon un nombre corto (por ejemplo `kate-universo`).

### Opción B — Cloudflare Pages
1. Cuenta gratis en **pages.cloudflare.com** → *Create a project → Upload assets*.
2. Sube la carpeta, ponle nombre y *Deploy*.

### Opción C — GitHub Pages
1. Crea un repositorio y sube los 6 archivos.
2. *Settings → Pages → Deploy from a branch → main / (root)*.
3. El enlace será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
4. Ojo: en un repositorio público cualquiera podría leer tus mensajes en `config.js`. Si te importa la privacidad, prefiere A o B.

La página incluye `noindex` para que Google no la indexe.

## 6. Consejos para el gran momento

- **Pruébala hoy en tu teléfono**, con datos móviles y con Wi-Fi.
- Sube el brillo y quita el modo silencio si quieres que escuche la música.
- Dura unos 3–4 minutos si lee con calma. Mejor que la abra sola y tranquila, o contigo cerca pero sin prisa.
- Si abre el enlace desde WhatsApp, el navegador interno a veces es más lento. Si algo se ve raro, que lo abra en Chrome/Safari.
- La página respeta su libertad: el botón «Quiero leer algo más 💌» le da espacio, puede volver a la pregunta o seguir explorando, y no hay botones "trampa".

## 7. Personalizar más

- **Colores:** variables al inicio de `style.css` (`--violet`, `--pink`...).
- **Deseos:** lista `wish.list` en `config.js`.
- **Secreto y mensaje extra:** `explore.secretMsg` y `proposal.moreMsg`.
- **Ritmo de la declaración:** en `script.js`, dentro de `hooks.proposal`, los `sleep(...)` controlan las pausas (en milisegundos).

Mucha suerte. 💜
