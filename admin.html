// ====== PANEL DE ADMINISTRACIÓN · Paso 17: varias fotos por prenda ======

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

const TEXTO_AYUDA_FOTO = "Podés elegir hasta 6 fotos. La primera es la portada. Se achican solas al subirlas.";

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

    if (Array.isArray(prenda.fotos) && prenda.fotos.length > 0) {
      fotosActuales = [...prenda.fotos];
    } else if (prenda.foto_url) {
      fotosActuales = [prenda.foto_url];
    } else {
      fotosActuales = [];
    }
  } else {
    form.reset();
    document.getElementById("form-titulo").textContent = "Nueva prenda";
    document.getElementById("p-id").value = "";
    fotosActuales = [];
  }

  dibujarFotos();
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("p-nombre").focus();
}

function cerrarFormulario() {
  const form = document.getElementById("form-prenda");
  form.reset();
  document.getElementById("p-id").value = "";
  fotosActuales = [];
  dibujarFotos();
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
    fotos: fotosActuales,
    foto_url: fotosActuales[0] || null // la portada sigue guardada en foto_url
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

// Elegir fotos: cada una se achica, se sube y se agrega a la tira de miniaturas
document.getElementById("p-archivo").addEventListener("change", async function (evento) {
  const archivos = Array.from(evento.target.files);
  if (archivos.length === 0) return;

  const estado = document.getElementById("p-foto-estado");
  const botonGuardar = document.getElementById("btn-guardar");

  const lugares = MAXIMO_FOTOS - fotosActuales.length;
  if (lugares <= 0) {
    estado.textContent = `Ya hay ${MAXIMO_FOTOS} fotos. Quitá alguna para poder agregar otra.`;
    evento.target.value = "";
    return;
  }

  const aSubir = archivos.slice(0, lugares);
  const sobraron = archivos.length - aSubir.length;

  botonGuardar.disabled = true;
  let subidas = 0;

  try {
    for (let i = 0; i < aSubir.length; i++) {
      estado.textContent = `Subiendo foto ${i + 1} de ${aSubir.length}…`;
      const blob = await achicarImagen(aSubir[i]);
      const direccion = await subirFoto(blob);
      fotosActuales.push(direccion);
      subidas++;
      dibujarFotos();
    }

    estado.textContent = sobraron > 0
      ? `Se subieron ${subidas} fotos. Las otras ${sobraron} no entraron (máximo ${MAXIMO_FOTOS}). Se guardan al tocar Guardar.`
      : `${subidas === 1 ? "Foto lista" : subidas + " fotos listas"} ✓ (se guardan al tocar Guardar).`;
  } catch (e) {
    if (e.message === "sin-sesion") {
      mostrar("pantalla-login");
    } else {
      console.error(e);
      estado.textContent = e.message;
    }
  } finally {
    botonGuardar.disabled = false;
    evento.target.value = ""; // permite elegir de nuevo las mismas fotos
  }
});

// Quitar una foto o cambiar la portada (se aplica al guardar)
document.getElementById("p-fotos").addEventListener("click", function (evento) {
  const boton = evento.target.closest("[data-foto-accion]");
  if (!boton) return;

  const indice = Number(boton.dataset.indice);
  if (!Number.isInteger(indice) || indice < 0 || indice >= fotosActuales.length) return;

  if (boton.dataset.foto === "quitar" || boton.dataset.fotoAccion === "quitar") {
    fotosActuales.splice(indice, 1);
  } else if (boton.dataset.fotoAccion === "portada") {
    const elegida = fotosActuales.splice(indice, 1)[0];
    fotosActuales.unshift(elegida);
  }

  dibujarFotos();
  document.getElementById("p-foto-estado").textContent =
    "Cambio listo ✓ (se guarda al tocar Guardar).";
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
