// ====== PANEL DE ADMINISTRACIÓN · Paso 19: descargar Excel con fotos ======

const CLAVE_SESION = "flor-admin-sesion";
const BUCKET_FOTOS = "prendas";
const ANCHO_MAXIMO = 1200; // las fotos se achican a este ancho máximo (px)
const MAXIMO_FOTOS = 6;    // máximo de fotos por prenda
let sesion = null;
let listaPrendas = []; // prendas cargadas desde Supabase
let fotosActuales = []; // fotos de la prenda que se está editando (la primera es la portada)

// ====== UTILIDADES ======
function esc(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatearPrecio(numero) {
  return "$ " + numero.toLocaleString("es-UY");
}

function mostrar(idPantalla) {
  ["pantalla-login", "pantalla-panel", "mensaje-inicial"].forEach(id => {
    document.getElementById(id).hidden = (id !== idPantalla);
  });
  document.getElementById("salir").hidden = (idPantalla !== "pantalla-panel");
}

// ====== SESIÓN ======
function guardarSesion(datos) {
  sesion = {
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
    expira: Date.now() + (datos.expires_in - 60) * 1000
  };
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch (error) {}
}

function cargarSesion() {
  try {
    sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
  } catch (error) {
    sesion = null;
  }
}

function borrarSesion() {
  sesion = null;
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch (error) {}
}

async function iniciarSesion(email, clave) {
  const respuesta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_CLAVE_PUBLICA, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: clave })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error("Email o contraseña incorrectos.");
  guardarSesion(datos);
}

async function renovarSesion() {
  const respuesta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_CLAVE_PUBLICA, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sesion.refresh_token })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error("La sesión venció.");
  guardarSesion(datos);
}

// Devuelve un token vigente, o null si hay que volver a ingresar
async function obtenerToken() {
  if (!sesion) return null;
  if (Date.now() >= sesion.expira) {
    try {
      await renovarSesion();
    } catch (error) {
      borrarSesion();
      return null;
    }
  }
  return sesion.access_token;
}

// ====== CONSULTAS A SUPABASE (con tu sesión) ======
async function consultar(ruta, opciones = {}) {
  const token = await obtenerToken();
  if (!token) throw new Error("sin-sesion");

  const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: SUPABASE_CLAVE_PUBLICA,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opciones.headers || {})
    }
  });

  if (!respuesta.ok) throw new Error("Error " + respuesta.status);
  return respuesta.json();
}

// ====== CAMBIAR UNA PRENDA EXISTENTE ======
async function actualizarPrenda(id, cambios) {
  const resultado = await consultar(`prendas?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(cambios)
  });

  if (!Array.isArray(resultado) || resultado.length === 0) {
    throw new Error("No se pudo guardar el cambio (sin permisos).");
  }
  return resultado[0];
}

// ====== CREAR UNA PRENDA NUEVA ======
async function crearPrenda(datos) {
  const resultado = await consultar("prendas", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(datos)
  });

  if (!Array.isArray(resultado) || resultado.length === 0) {
    throw new Error("No se pudo crear la prenda.");
  }
  return resultado[0];
}

// ====== BORRAR UNA PRENDA ======
async function borrarPrenda(id) {
  const resultado = await consultar(`prendas?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" }
  });

  // Si Supabase no borró nada (por ejemplo, sin permisos), la lista viene vacía
  if (!Array.isArray(resultado) || resultado.length === 0) {
    throw new Error("No se pudo borrar la prenda (sin permisos).");
  }
}

// ====== FOTOS: achicar y subir ======
// Achica la foto a un ancho máximo y la convierte a JPG liviano
function achicarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const direccion = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = function () {
      URL.revokeObjectURL(direccion);

      let ancho = imagen.naturalWidth;
      let alto = imagen.naturalHeight;
      if (ancho > ANCHO_MAXIMO) {
        alto = Math.round(alto * ANCHO_MAXIMO / ancho);
        ancho = ANCHO_MAXIMO;
      }

      const lienzo = document.createElement("canvas");
      lienzo.width = ancho;
      lienzo.height = alto;
      const contexto = lienzo.getContext("2d");
      contexto.fillStyle = "#ffffff"; // fondo blanco por si la foto es PNG transparente
      contexto.fillRect(0, 0, ancho, alto);
      contexto.drawImage(imagen, 0, 0, ancho, alto);

      lienzo.toBlob(function (blob) {
        if (blob) {
          resolver(blob);
        } else {
          rechazar(new Error("No se pudo procesar la foto."));
        }
      }, "image/jpeg", 0.82);
    };

    imagen.onerror = function () {
      URL.revokeObjectURL(direccion);
      rechazar(new Error("No se pudo leer la foto. Probá con una foto JPG o PNG."));
    };

    imagen.src = direccion;
  });
}

// Sube la foto a Supabase y devuelve su dirección pública
async function subirFoto(blob) {
  const token = await obtenerToken();
  if (!token) throw new Error("sin-sesion");

  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const respuesta = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${nombre}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_CLAVE_PUBLICA,
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg"
    },
    body: blob
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo subir la foto. Revisá tu conexión e intentá de nuevo.");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${nombre}`;
}

// Dibuja la tira de miniaturas de las fotos de la prenda
function dibujarFotos() {
  const contenedor = document.getElementById("p-fotos");

  contenedor.innerHTML = fotosActuales.map(function (direccion, indice) {
    const etiqueta = indice === 0
      ? `<span class="admin-foto-portada">Portada</span>`
      : "";
    const botonPortada = indice === 0
      ? ""
      : `<button class="admin-foto-boton" type="button" data-foto-accion="portada" data-indice="${indice}">Hacer portada</button>`;

    return `
      <div class="admin-foto-item">
        <div class="admin-foto-marco">
          <img src="${esc(direccion)}" alt="">
          ${etiqueta}
        </div>
        ${botonPortada}
        <button class="admin-foto-boton" type="button" data-foto-accion="quitar" data-indice="${indice}">Quitar</button>
      </div>
    `;
  }).join("");
}

// ====== DIBUJAR LA LISTA ======
function crearFilaAdmin(prenda) {
  const portada = prenda.foto_url || (Array.isArray(prenda.fotos) && prenda.fotos[0]) || "";

  let miniatura;
  if (portada) {
    miniatura = `<img class="admin-miniatura" src="${esc(portada)}" alt="">`;
  } else {
    miniatura = `<div class="admin-miniatura" style="background:${esc(prenda.color)}"></div>`;
  }

  const cantidadFotos = Array.isArray(prenda.fotos) ? prenda.fotos.length : 0;
  const textoFotos = cantidadFotos > 1 ? ` · ${cantidadFotos} fotos` : "";

  const estadoVenta = prenda.disponible
    ? `<span class="insignia verde">Disponible</span>`
    : `<span class="insignia rojo">Vendida</span>`;

  const estadoVisible = prenda.visible
    ? `<span class="insignia">Visible en la tienda</span>`
    : `<span class="insignia gris">Oculta</span>`;

  const textoVenta = prenda.disponible ? "Marcar vendida" : "Marcar disponible";
  const textoVisible = prenda.visible ? "Ocultar" : "Mostrar";

  return `
    <div class="admin-prenda">
      ${miniatura}
      <div class="admin-datos">
        <p class="admin-nombre">${esc(prenda.nombre)}</p>
        <p class="detalle">Talle ${esc(prenda.talle)} · ${esc(prenda.categoria)} · ${formatearPrecio(prenda.precio)}${textoFotos}</p>
        <div class="admin-etiquetas">${estadoVenta}${estadoVisible}</div>
      </div>
      <div class="admin-acciones">
        <button class="admin-accion" type="button" data-accion="editar" data-id="${prenda.id}">Editar</button>
        <button class="admin-accion" type="button" data-accion="vendida" data-id="${prenda.id}">${textoVenta}</button>
        <button class="admin-accion" type="button" data-accion="visible" data-id="${prenda.id}">${textoVisible}</button>
        <button class="admin-accion" type="button" data-accion="borrar" data-id="${prenda.id}" style="color:#A84F36;border-color:#A84F36">B
