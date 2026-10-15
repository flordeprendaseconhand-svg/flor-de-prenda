// ====== PANEL DE ADMINISTRACIÓN · Parte B1: lista + vendida/oculta ======

const CLAVE_SESION = "flor-admin-sesion";
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

// ====== CAMBIAR UN CAMPO DE UNA PRENDA ======
// Devuelve la prenda actualizada. Si Supabase no modificó nada
// (por ejemplo, por falta de permisos), avisa con un error.
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
  document.getElementById("lista-admin").innerHTML = "";
  mostrar("pantalla-login");
});

// Botones "Marcar vendida" y "Ocultar" de cada prenda
document.getElementById("lista-admin").addEventListener("click", async function (evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const id = Number(boton.dataset.id);
  const prenda = listaPrendas.find(p => p.id === id);
  if (!prenda) return;

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