// ====== PANEL DE ADMINISTRACIÓN · Paso 16: fotos ======

const CLAVE_SESION = "flor-admin-sesion";
const BUCKET_FOTOS = "prendas";
const ANCHO_MAXIMO = 1200; // las fotos se achican a este ancho máximo (px)
let sesion = null;
let listaPrendas = []; // prendas cargadas desde Supabase

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

// Muestra (o esconde) la vista previa de la foto en el formulario
function mostrarPrevia(direccion) {
  const previa = document.getElementById("p-previa");
  const quitar = document.getElementById("p-quitar-foto");

  if (direccion) {
    previa.src = direccion;
    previa.hidden = false;
    quitar.hidden = false;
  } else {
    previa.removeAttribute("src");
    previa.hidden = true;
    quitar.hidden = true;
  }
}

// ====== DIBUJAR LA LISTA ======
function crearFilaAdmin(prenda) {
  let miniatura;
  if (prenda.foto_url) {
    miniatura = `<img class="admin-miniatura" src="${esc(prenda.foto_url)}" alt="">`;
  } else {
    miniatura = `<div class="admin-miniatura" style="background:${esc(prenda.color)}"></div>`;
  }

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
        <p class="detalle">Talle ${esc(prenda.talle)} · ${esc(prenda.categoria)} · ${formatearPrecio(prenda.precio)}</p>
        <div class="admin-etiquetas">${estadoVenta}${estadoVisible}</div>
      </div>
      <div class="admin-acciones">
        <button class="admin-accion" type="button" data-accion="editar" data-id="${prenda.id}">Editar</button>
        <button class="admin-accion" type="button" data-accion="vendida" data-id="${prenda.id}">${textoVenta}</button>
        <button class="admin-accion" type="button" data-accion="visible" data-id="${prenda.id}">${textoVisible}</button>
      </div>
    </div>
  `;
}

function dibujarLista() {
  const ocultas = listaPrendas.filter(p => !p.visible).length;
  const vendidas = listaPrendas.filter(p => !p.disponible).length;

  document.getElementById("aviso-panel").textContent =
    `${listaPrendas.length} prendas en total · ${vendidas} vendidas · ${ocultas} ocultas.`;

  document.getElementById("lista-admin").innerHTML =
    listaPrendas.length
      ? listaPrendas.map(crearFilaAdmin).join("")
      : "<p>Todavía no hay prendas.</p>";
}

// ====== FORMULARIO DE PRENDA ======
function actualizarCategorias() {
  const categorias = [...new Set(listaPrendas.map(p => p.categoria))];
  document.getElementById("lista-categorias").innerHTML =
    categorias.map(c => `<option value="${esc(c)}"></option>`).join("");
}

const TEXTO_AYUDA_FOTO = "Elegí una foto vertical y con buena luz. Se achica sola al subirla.";

// Abre el formulario. Sin argumento = prenda nueva. Con una prenda = editar.
function abrirFormulario(prenda) {
  const form = document.getElementById("form-prenda");
  document.getElementById("form-error").hidden = true;
  document.getElementById("p-foto-estado").textContent = TEXTO_AYUDA_FOTO;
  actualizarCategorias();

  if (prenda) {
    document.getElementById("form-titulo").textContent = "Editar prenda";
    document.getElementById("p-id").value = prenda.id;
    document.getElementById("p-nombre").value = prenda.nombre;
    document.getElementById("p-categoria").value = prenda.categoria;
    document.getElementById("p-talle").value = prenda.talle;
    document.getElementById("p-precio").value = prenda.precio;
    document.getElementById("p-descripcion").value = prenda.descripcion || "";
    document.getElementById("p-foto").value = prenda.foto_url || "";
    mostrarPrevia(prenda.foto_url || "");
  } else {
    form.reset();
    document.getElementById("form-titulo").textContent = "Nueva prenda";
    document.getElementById("p-id").value = "";
    document.getElementById("p-foto").value = "";
    mostrarPrevia("");
  }

  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("p-nombre").focus();
}

function cerrarFormulario() {
  const form = document.getElementById("form-prenda");
  form.reset();
  document.getElementById("p-id").value = "";
  document.getElementById("p-foto").value = "";
  mostrarPrevia("");
  document.getElementById("form-error").hidden = true;
  form.hidden = true;
}

async function guardarFormulario(evento) {
  evento.preventDefault();

  const error = document.getElementById("form-error");
  const botonGuardar = document.getElementById("btn-guardar");
  error.hidden = true;

  const precio = Number(document.getElementById("p-precio").value);
  if (!Number.isInteger(precio) || precio < 0) {
    error.textContent = "El precio tiene que ser un número entero, sin puntos ni comas.";
    error.hidden = false;
    return;
  }

  const datos = {
    nombre: document.getElementById("p-nombre").value.trim(),
    categoria: document.getElementById("p-categoria").value.trim(),
    talle: document.getElementById("p-talle").value.trim(),
    precio: precio,
    descripcion: document.getElementById("p-descripcion").value.trim() || null,
    foto_url: document.getElementById("p-foto").value.trim() || null
  };

  if (!datos.nombre || !datos.categoria || !datos.talle) {
    error.textContent = "Completá nombre, categoría y talle.";
    error.hidden = false;
    return;
  }

  const id = document.getElementById("p-id").value;

  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando…";

  try {
    if (id) {
      const actualizada = await actualizarPrenda(Number(id), datos);
      const posicion = listaPrendas.findIndex(p => p.id === Number(id));
      listaPrendas[posicion] = actualizada;
    } else {
      const nueva = await crearPrenda(datos);
      listaPrendas.unshift(nueva);
    }
    cerrarFormulario();
    dibujarLista();
  } catch (e) {
    if (e.message === "sin-sesion") {
      mostrar("pantalla-login");
    } else {
      console.error(e);
      error.textContent = "No se pudo guardar. Revisá tu conexión e intentá de nuevo.";
      error.hidden = false;
    }
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";
  }
}

// ====== PANEL ======
async function mostrarPanel() {
  mostrar("mensaje-inicial");

  try {
    // ¿Esta persona está en la lista de administradoras?
    const esAdmin = await consultar("rpc/es_admin", {
      method: "POST",
      body: "{}"
    });

    if (esAdmin !== true) {
      document.getElementById("mensaje-inicial").textContent =
        "Tu usuario inició sesión, pero no figura como administradora. Revisá el paso 14.";
      document.getElementById("salir").hidden = false;
      return;
    }

    listaPrendas = await consultar("prendas?select=*&order=creado_en.desc");
    dibujarLista();
    mostrar("pantalla-panel");
  } catch (error) {
    if (error.message === "sin-sesion") {
      mostrar("pantalla-login");
    } else {
      console.error(error);
      document.getElementById("mensaje-inicial").textContent =
        "No se pudo cargar el panel. Probá recargar la página.";
    }
  }
}

// ====== EVENTOS ======
document.getElementById("form-login").addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const error = document.getElementById("login-error");
  error.hidden = true;

  try {
    await iniciarSesion(
      document.getElementById("email").value.trim(),
      document.getElementById("clave").value
    );
    document.getElementById("clave").value = "";
    mostrarPanel();
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
  }
});

document.getElementById("salir").addEventListener("click", function () {
  borrarSesion();
  listaPrendas = [];
  cerrarFormulario();
  document.getElementById("lista-admin").innerHTML = "";
  mostrar("pantalla-login");
});

// Formulario de prenda
document.getElementById("btn-nueva").addEventListener("click", function () {
  abrirFormulario(null);
});
document.getElementById("btn-cancelar").addEventListener("click", cerrarFormulario);
document.getElementById("form-prenda").addEventListener("submit", guardarFormulario);

// Evita que la rueda del mouse cambie el precio sin querer
document.getElementById("p-precio").addEventListener("wheel", function (evento) {
  evento.target.blur();
});

// Elegir una foto: se achica, se sube y se muestra la vista previa
document.getElementById("p-archivo").addEventListener("change", async function (evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  const estado = document.getElementById("p-foto-estado");
  const botonGuardar = document.getElementById("btn-guardar");

  botonGuardar.disabled = true;
  estado.textContent = "Subiendo foto…";

  try {
    const blob = await achicarImagen(archivo);
    const direccion = await subirFoto(blob);
    document.getElementById("p-foto").value = direccion;
    mostrarPrevia(direccion);
    estado.textContent = "Foto lista ✓ (se guarda al tocar Guardar).";
  } catch (e) {
    if (e.message === "sin-sesion") {
      mostrar("pantalla-login");
    } else {
      console.error(e);
      estado.textContent = e.message;
    }
  } finally {
    botonGuardar.disabled = false;
    evento.target.value = ""; // permite elegir de nuevo la misma foto
  }
});

// Quitar la foto de la prenda (se aplica al guardar)
document.getElementById("p-quitar-foto").addEventListener("click", function () {
  document.getElementById("p-foto").value = "";
  mostrarPrevia("");
  document.getElementById("p-foto-estado").textContent = TEXTO_AYUDA_FOTO;
});

// Botones de cada prenda: Editar, Marcar vendida, Ocultar
document.getElementById("lista-admin").addEventListener("click", async function (evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const id = Number(boton.dataset.id);
  const prenda = listaPrendas.find(p => p.id === id);
  if (!prenda) return;

  if (boton.dataset.accion === "editar") {
    abrirFormulario(prenda);
    return;
  }

  // Armamos el cambio: invierte el valor actual
  let cambios;
  if (boton.dataset.accion === "vendida") {
    cambios = { disponible: !prenda.disponible };
  } else {
    cambios = { visible: !prenda.visible };
  }

  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const actualizada = await actualizarPrenda(id, cambios);
    const posicion = listaPrendas.findIndex(p => p.id === id);
    listaPrendas[posicion] = actualizada;
    dibujarLista();
  } catch (error) {
    if (error.message === "sin-sesion") {
      mostrar("pantalla-login");
    } else {
      alert("No se pudo guardar el cambio. Revisá tu conexión e intentá de nuevo.");
      dibujarLista();
    }
  }
});

// ====== ARRANQUE ======
cargarSesion();
if (sesion) {
  mostrarPanel();
} else {
  mostrar("pantalla-login");
}