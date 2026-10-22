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
        <button class="admin-accion" type="button" data-accion="borrar" data-id="${prenda.id}" style="color:#A84F36;border-color:#A84F36">Borrar</button>
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
  const categorias = [...new Set(listaPrendas.map(p => p.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));

  document.getElementById("lista-categorias").innerHTML =
    categorias.map(c => `<option value="${esc(c)}"></option>`).join("");

  document.getElementById("p-categorias-sugeridas").innerHTML =
    categorias.length
      ? `<span class="admin-sugerencias-titulo">Categorías usadas:</span>` +
        categorias.map(c => `<button class="admin-sugerencia" type="button" data-categoria="${esc(c)}">${esc(c)}</button>`).join("")
      : "";
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

  // Limpia el mensaje del Excel (si el botón existe)
  const estadoExcel = document.getElementById("excel-estado");
  if (estadoExcel) estadoExcel.textContent = "";

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
// Tocar una categoría sugerida la completa en el campo
document.getElementById("p-categorias-sugeridas").addEventListener("click", function (evento) {
  const boton = evento.target.closest("[data-categoria]");
  if (!boton) return;
  document.getElementById("p-categoria").value = boton.dataset.categoria;
});
// Quitar una foto o cambiar la portada (se aplica al guardar)
document.getElementById("p-fotos").addEventListener("click", function (evento) {
  const boton = evento.target.closest("[data-foto-accion]");
  if (!boton) return;

  const indice = Number(boton.dataset.indice);
  if (!Number.isInteger(indice) || indice < 0 || indice >= fotosActuales.length) return;

  if (boton.dataset.fotoAccion === "quitar") {
    fotosActuales.splice(indice, 1);
  } else if (boton.dataset.fotoAccion === "portada") {
    const elegida = fotosActuales.splice(indice, 1)[0];
    fotosActuales.unshift(elegida);
  }

  dibujarFotos();
  document.getElementById("p-foto-estado").textContent =
    "Cambio listo ✓ (se guarda al tocar Guardar).";
});

// Botones de cada prenda: Editar, Marcar vendida, Ocultar, Borrar
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

  // Borrar: primero pregunta, y solo borra si confirmás
  if (boton.dataset.accion === "borrar") {
    const seguro = confirm(
      `¿Seguro que querés borrar "${prenda.nombre}"?\n\n` +
      `Esto no se puede deshacer. Si solo querés que no se vea en la tienda, usá "Ocultar".`
    );
    if (!seguro) return;

    boton.disabled = true;
    boton.textContent = "Borrando…";

    try {
      await borrarPrenda(id);
      listaPrendas = listaPrendas.filter(p => p.id !== id);

      // Si justo se estaba editando esa prenda, cerramos el formulario
      if (document.getElementById("p-id").value === String(id)) {
        cerrarFormulario();
      }
      dibujarLista();
    } catch (error) {
      if (error.message === "sin-sesion") {
        mostrar("pantalla-login");
      } else {
        console.error(error);
        alert("No se pudo borrar la prenda. Revisá tu conexión e intentá de nuevo.");
        dibujarLista();
      }
    }
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

// ====== DESCARGAR INVENTARIO (Excel con miniaturas y enlaces a las fotos) ======
// La herramienta que arma el Excel se baja solo cuando tocás el botón
const DIRECCION_EXCELJS = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";

function cargarExcelJS() {
  return new Promise(function (resolver, rechazar) {
    if (window.ExcelJS) {
      resolver();
      return;
    }
    const script = document.createElement("script");
    script.src = DIRECCION_EXCELJS;
    script.onload = function () { resolver(); };
    script.onerror = function () {
      rechazar(new Error("No se pudo cargar la herramienta de Excel. Revisá tu conexión e intentá de nuevo."));
    };
    document.head.appendChild(script);
  });
}

// Lista de fotos de una prenda (la primera es la portada)
function fotosDe(prenda) {
  if (Array.isArray(prenda.fotos) && prenda.fotos.length > 0) {
    return prenda.fotos.filter(Boolean);
  }
  if (prenda.foto_url) return [prenda.foto_url];
  return [];
}

// Baja una foto y la achica a una miniatura para meterla dentro del Excel
async function miniaturaDeFoto(direccion) {
  const respuesta = await fetch(direccion);
  if (!respuesta.ok) throw new Error("foto");
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);

  try {
    const imagen = await new Promise(function (resolver, rechazar) {
      const img = new Image();
      img.onload = function () { resolver(img); };
      img.onerror = function () { rechazar(new Error("foto")); };
      img.src = url;
    });

    // Tamaño con el que se ve en el Excel (entra en una caja de 60 x 84)
    const factor = Math.min(60 / imagen.naturalWidth, 84 / imagen.naturalHeight);
    const ancho = Math.max(1, Math.round(imagen.naturalWidth * factor));
    const alto = Math.max(1, Math.round(imagen.naturalHeight * factor));

    // La dibujamos al doble de tamaño para que se vea nítida
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho * 2;
    lienzo.height = alto * 2;
    const contexto = lienzo.getContext("2d");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    return { dato: lienzo.toDataURL("image/jpeg", 0.8), ancho: ancho, alto: alto };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fechaCorta(texto) {
  if (!texto) return "";
  const fecha = new Date(texto);
  return isNaN(fecha) ? "" : fecha.toLocaleDateString("es-UY");
}

function descargarArchivo(blob, nombre) {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 10000);
}

async function descargarExcel() {
  const boton = document.getElementById("btn-excel");
  const estado = document.getElementById("excel-estado");

  if (listaPrendas.length === 0) {
    estado.textContent = "Todavía no hay prendas para descargar.";
    return;
  }

  boton.disabled = true;
  estado.textContent = "Preparando el Excel…";

  try {
    await cargarExcelJS();

    const libro = new ExcelJS.Workbook();
    libro.creator = "Flor de Prenda";
    const hoja = libro.addWorksheet("Prendas", { views: [{ state: "frozen", ySplit: 1 }] });

    const columnas = [
      { header: "Foto", key: "foto", width: 12 },
      { header: "Nombre", key: "nombre", width: 28 },
      { header: "Categoría", key: "categoria", width: 16 },
      { header: "Talle", key: "talle", width: 9 },
      { header: "Precio", key: "precio", width: 12 },
      { header: "Estado", key: "estado", width: 13 },
      { header: "En la tienda", key: "visible", width: 13 },
      { header: "Cargada el", key: "creada", width: 13 },
      { header: "Descripción", key: "descripcion", width: 42 },
      { header: "Cant. de fotos", key: "cantidad", width: 14 }
    ];
    for (let n = 1; n <= MAXIMO_FOTOS; n++) {
      columnas.push({ header: "Foto " + n, key: "foto" + n, width: 12 });
    }
    hoja.columns = columnas;

    // Fila de títulos con los colores de la marca
    const titulos = hoja.getRow(1);
    titulos.height = 24;
    titulos.eachCell(function (celda) {
      celda.font = { bold: true, color: { argb: "FFF7F2E9" } };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF34483C" } };
      celda.alignment = { vertical: "middle", horizontal: "center" };
    });
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length }
    };

    // Una fila por prenda
    listaPrendas.forEach(function (prenda) {
      const fotos = fotosDe(prenda);

      const fila = hoja.addRow({
        nombre: prenda.nombre,
        categoria: prenda.categoria,
        talle: prenda.talle,
        precio: prenda.precio,
        estado: prenda.disponible ? "Disponible" : "Vendida",
        visible: prenda.visible ? "Visible" : "Oculta",
        creada: fechaCorta(prenda.creado_en),
        descripcion: prenda.descripcion || "",
        cantidad: fotos.length
      });

      fila.height = 66;
      fila.getCell("precio").numFmt = '"$" #,##0';

      // Enlaces a cada foto
      fotos.slice(0, MAXIMO_FOTOS).forEach(function (direccion, n) {
        const celda = fila.getCell("foto" + (n + 1));
        celda.value = { text: "Ver foto " + (n + 1), hyperlink: direccion };
        celda.font = { color: { argb: "FF0563C1" }, underline: true };
      });

      fila.eachCell({ includeEmpty: true }, function (celda) {
        celda.alignment = { vertical: "middle", wrapText: true };
      });
    });

    // Miniaturas de la portada (de a 5 para que sea más rápido)
    const conPortada = [];
    listaPrendas.forEach(function (prenda, i) {
      const portada = fotosDe(prenda)[0];
      if (portada) conPortada.push({ indice: i, portada: portada });
    });

    let hechas = 0;
    for (let inicio = 0; inicio < conPortada.length; inicio += 5) {
      const grupo = conPortada.slice(inicio, inicio + 5);

      await Promise.all(grupo.map(async function (item) {
        try {
          const mini = await miniaturaDeFoto(item.portada);
          const idImagen = libro.addImage({ base64: mini.dato, extension: "jpeg" });
          hoja.addImage(idImagen, {
            tl: { col: 0.15, row: item.indice + 1.05 },
            ext: { width: mini.ancho, height: mini.alto }
          });
        } catch (error) {
          // Si una foto no se puede bajar, esa fila queda sin miniatura (igual tiene el enlace)
        }
        hechas++;
        estado.textContent = "Preparando fotos… " + hechas + " de " + conPortada.length;
      }));
    }

    estado.textContent = "Guardando el archivo…";
    const contenido = await libro.xlsx.writeBuffer();
    const blob = new Blob([contenido], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const hoy = new Date().toISOString().slice(0, 10);
    descargarArchivo(blob, "flor-de-prenda-prendas-" + hoy + ".xlsx");

    estado.textContent = "Listo ✓ Se descargó el Excel con " + listaPrendas.length + " prendas.";
  } catch (error) {
    console.error(error);
    estado.textContent = error.message && error.message.indexOf("herramienta") !== -1
      ? error.message
      : "No se pudo armar el Excel. Probá de nuevo.";
  } finally {
    boton.disabled = false;
  }
}

// Conecta el botón (si todavía no existe en la página, no hace nada)
const botonExcel = document.getElementById("btn-excel");
if (botonExcel) botonExcel.addEventListener("click", descargarExcel);

// ====== ARRANQUE ======
cargarSesion();
if (sesion) {
  mostrarPanel();
} else {
  mostrarPanel_o_login();
}

function mostrarPanel_o_login() {
  mostrar("pantalla-login");
}
