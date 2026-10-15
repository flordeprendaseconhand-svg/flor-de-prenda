// ====== DATOS DEL NEGOCIO ======
// IMPORTANTE: reemplazá este número por el tuyo (formato 598 + celular sin el 0)
const WHATSAPP_NUMERO = "59898234948";
const NOMBRE_TIENDA = "Flor de Prenda";

// ====== ESTADO ======
let categoriaActiva = "Todas";
let talleActivo = "Todos";
let carrito = []; // guarda los "id" de las prendas elegidas
let prendas = []; // se llena desde Supabase
let fichaAbierta = null; // id de la prenda cuya ficha está abierta (o null)

// ====== UTILIDADES ======
// Convierte 1490 en "$ 1.490"
function formatearPrecio(numero) {
  return "$ " + numero.toLocaleString("es-UY");
}

// Evita que un texto raro rompa la página (seguridad básica)
function esc(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Busca una prenda por su id
function buscarPrenda(id) {
  return prendas.find(p => p.id === id);
}

// ====== LEER PRENDAS DESDE SUPABASE ======
async function cargarPrendas() {
  const url = `${SUPABASE_URL}/rest/v1/prendas?select=*&order=creado_en.desc`;
  const respuesta = await fetch(url, {
    headers: { apikey: SUPABASE_CLAVE_PUBLICA }
  });

  if (!respuesta.ok) {
    throw new Error("Supabase respondió con error " + respuesta.status);
  }

  const datos = await respuesta.json();

  // Armamos la lista de fotos de cada prenda.
  // Si no tiene lista nueva, usamos la foto vieja (foto_url).
  // "foto" es la portada: la primera de la lista.
  prendas = datos.map(p => {
    let fotos = [];
    if (Array.isArray(p.fotos) && p.fotos.length > 0) {
      fotos = p.fotos.filter(Boolean);
    } else if (p.foto_url) {
      fotos = [p.foto_url];
    }
    return { ...p, fotos: fotos, foto: fotos[0] || null };
  });
}

// ====== CARRITO: guardar y recuperar ======
function guardarCarrito() {
  try {
    localStorage.setItem("flor-carrito", JSON.stringify(carrito));
  } catch (error) {
    // Si el navegador no deja guardar, el carrito igual funciona esta sesión
  }
}

function cargarCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem("flor-carrito")) || [];
    // Solo conservamos prendas que existen y siguen disponibles
    carrito = guardado.filter(id => {
      const prenda = buscarPrenda(id);
      return prenda && prenda.disponible;
    });
  } catch (error) {
    carrito = [];
  }
}

// ====== CARRITO: acciones ======
function agregarAlCarrito(id) {
  const prenda = buscarPrenda(id);
  if (!prenda || !prenda.disponible) return;
  if (carrito.includes(id)) return; // prenda única: no se agrega dos veces
  carrito.push(id);
  actualizarTodo();
}

function quitarDelCarrito(id) {
  carrito = carrito.filter(item => item !== id);
  actualizarTodo();
}

function vaciarCarrito() {
  carrito = [];
  actualizarTodo();
}

// Guarda y vuelve a dibujar todo lo que depende del carrito
function actualizarTodo() {
  guardarCarrito();
  mostrarCarrito();
  mostrarPrendas();

  // Si hay una ficha abierta, actualizamos su botón (sin mover las fotos)
  if (fichaAbierta !== null) {
    const prenda = buscarPrenda(fichaAbierta);
    if (prenda) dibujarInfoFicha(prenda);
  }
}

// ====== CARRITO: abrir y cerrar el panel ======
function abrirCarrito() {
  document.getElementById("panel-carrito").classList.add("abierto");
  document.getElementById("fondo-carrito").classList.add("abierto");
  document.body.classList.add("sin-scroll");
}

function cerrarCarrito() {
  document.getElementById("panel-carrito").classList.remove("abierto");
  document.getElementById("fondo-carrito").classList.remove("abierto");
  document.body.classList.remove("sin-scroll");
}

// ====== CARRITO: dibujar el contenido ======
function crearItemCarrito(prenda) {
  let miniatura;
  if (prenda.foto) {
    miniatura = `<img class="item-foto" src="${esc(prenda.foto)}" alt="${esc(prenda.nombre)}">`;
  } else {
    miniatura = `<div class="item-foto" style="background:${esc(prenda.color)}"></div>`;
  }

  return `
    <div class="item-carrito">
      ${miniatura}
      <div class="item-info">
        <p class="item-nombre">${esc(prenda.nombre)}</p>
        <p class="detalle">Talle ${esc(prenda.talle)} · ${esc(prenda.categoria)}</p>
        <p class="precio">${formatearPrecio(prenda.precio)}</p>
      </div>
      <button class="item-quitar" type="button" data-quitar="${prenda.id}" aria-label="Quitar ${esc(prenda.nombre)}">Quitar</button>
    </div>
  `;
}

function mostrarCarrito() {
  const items = carrito.map(buscarPrenda).filter(Boolean);

  // Contador del botón flotante
  document.getElementById("contador").textContent = items.length;

  const lista = document.getElementById("lista-carrito");
  const pie = document.getElementById("pie-carrito");

  if (items.length === 0) {
    lista.innerHTML = `<p class="carrito-vacio">Tu carrito está vacío.<br>Elegí alguna prenda que te guste.</p>`;
    pie.innerHTML = "";
    return;
  }

  lista.innerHTML = items.map(crearItemCarrito).join("");

  const subtotal = items.reduce((suma, prenda) => suma + prenda.precio, 0);
  const total = subtotal; // más adelante podría sumarse un envío

  pie.innerHTML = `
    <div class="fila-total">
      <span>Subtotal</span>
      <span>${formatearPrecio(subtotal)}</span>
    </div>
    <div class="fila-total fila-total-final">
      <span>Total</span>
      <span>${formatearPrecio(total)}</span>
    </div>
    <p class="nota-envio">El envío o retiro se coordina al finalizar el pedido.</p>
    <button class="boton boton-finalizar" id="finalizar" type="button">Finalizar pedido</button>
    <button class="vaciar" id="vaciar" type="button">Vaciar carrito</button>
  `;
}

// ====== TARJETAS DE PRENDAS ======
function crearTarjeta(prenda) {
  let foto;
  if (prenda.foto) {
    foto = `<img class="foto" src="${esc(prenda.foto)}" alt="${esc(prenda.nombre)}">`;
  } else {
    foto = `<div class="foto" style="background:${esc(prenda.color)}"></div>`;
  }

  let etiqueta = "";
  let claseVendida = "";
  let botonCompra;

  if (!prenda.disponible) {
    etiqueta = `<span class="etiqueta-vendida">Vendida</span>`;
    claseVendida = "vendida";
    botonCompra = `<button class="boton-agregar" type="button" disabled>No disponible</button>`;
  } else if (carrito.includes(prenda.id)) {
    botonCompra = `<button class="boton-agregar en-carrito" type="button" disabled>En tu carrito</button>`;
  } else {
    botonCompra = `<button class="boton-agregar" type="button" data-agregar="${prenda.id}">Agregar al carrito</button>`;
  }

  // Si tiene más de una foto, avisamos con una etiquetita
  const etiquetaFotos = prenda.fotos.length > 1
    ? `<span class="etiqueta-fotos">${prenda.fotos.length} fotos</span>`
    : "";

  return `
    <article class="tarjeta ${claseVendida}">
      <div class="foto-caja" data-ficha="${prenda.id}" role="button" tabindex="0" aria-label="Ver ${esc(prenda.nombre)}">
        ${foto}
        ${etiqueta}
        ${etiquetaFotos}
      </div>
      <h3 data-ficha="${prenda.id}">${esc(prenda.nombre)}</h3>
      <p class="detalle">Talle ${esc(prenda.talle)} · ${esc(prenda.categoria)}</p>
      <p class="precio">${formatearPrecio(prenda.precio)}</p>
      ${botonCompra}
    </article>
  `;
}

// ====== FICHA DE LA PRENDA ======
// Dibuja las fotos (una sola vez al abrir la ficha)
function dibujarGaleria(prenda) {
  const contenedor = document.getElementById("ficha-galeria");
  const cantidad = prenda.fotos.length;
  const etiquetaVendida = prenda.disponible
    ? ""
    : `<span class="etiqueta-vendida">Vendida</span>`;

  if (cantidad === 0) {
    contenedor.innerHTML = `
      <div class="ficha-foto" style="background:${esc(prenda.color)}"></div>
      ${etiquetaVendida}
    `;
    return;
  }

  const imagenes = prenda.fotos.map(function (direccion, i) {
    const carga = i > 0 ? ` loading="lazy"` : "";
    return `<img class="ficha-foto" src="${esc(direccion)}" alt="${esc(prenda.nombre)}, foto ${i + 1} de ${cantidad}"${carga}>`;
  }).join("");

  let extras = "";
  if (cantidad > 1) {
    const puntos = prenda.fotos.map(function (_, i) {
      return `<span class="ficha-punto${i === 0 ? " activo" : ""}"></span>`;
    }).join("");

    extras = `
      <button class="ficha-flecha ficha-flecha-izq" type="button" data-flecha="-1" aria-label="Foto anterior">‹</button>
      <button class="ficha-flecha ficha-flecha-der" type="button" data-flecha="1" aria-label="Foto siguiente">›</button>
      <div class="ficha-puntos" id="ficha-puntos">${puntos}</div>
    `;
  }

  contenedor.innerHTML = `
    <div class="ficha-pista" id="ficha-pista">${imagenes}</div>
    ${extras}
    ${etiquetaVendida}
  `;

  // Al deslizar, marcamos el puntito de la foto que se está viendo
  const pista = document.getElementById("ficha-pista");
  pista.addEventListener("scroll", function () {
    const indice = Math.round(pista.scrollLeft / pista.clientWidth);
    document.querySelectorAll("#ficha-puntos .ficha-punto").forEach(function (punto, i) {
      punto.classList.toggle("activo", i === indice);
    });
  });
}

// Dibuja el texto y el botón de la ficha (se redibuja al agregar al carrito)
function dibujarInfoFicha(prenda) {
  let botones;
  if (!prenda.disponible) {
    botones = `<button class="boton-agregar" type="button" disabled>No disponible</button>`;
  } else if (carrito.includes(prenda.id)) {
    botones = `
      <button class="boton-agregar en-carrito" type="button" disabled>En tu carrito</button>
      <button class="ficha-ver-carrito" type="button" data-ficha-carrito="1">Ver mi carrito</button>
    `;
  } else {
    botones = `<button class="boton-agregar" type="button" data-ficha-agregar="${prenda.id}">Agregar al carrito</button>`;
  }

  const descripcion = prenda.descripcion
    ? `<p class="ficha-descripcion">${esc(prenda.descripcion)}</p>`
    : "";

  document.getElementById("ficha-info").innerHTML = `
    <h2>${esc(prenda.nombre)}</h2>
    <p class="detalle">Talle ${esc(prenda.talle)} · ${esc(prenda.categoria)}</p>
    <p class="precio">${formatearPrecio(prenda.precio)}</p>
    ${descripcion}
    ${botones}
  `;
}

function abrirFicha(id) {
  const prenda = buscarPrenda(id);
  if (!prenda) return;

  fichaAbierta = id;
  dibujarGaleria(prenda);
  dibujarInfoFicha(prenda);

  const ficha = document.getElementById("ficha");
  ficha.scrollTop = 0;
  ficha.classList.add("abierta");
  document.getElementById("fondo-ficha").classList.add("abierta");
  document.body.classList.add("sin-scroll");
}

function cerrarFicha() {
  fichaAbierta = null;
  document.getElementById("ficha").classList.remove("abierta");
  document.getElementById("fondo-ficha").classList.remove("abierta");
  document.body.classList.remove("sin-scroll");
}

// ====== FILTROS ======
function valoresUnicos(campo) {
  return [...new Set(prendas.map(p => String(p[campo])))];
}

function crearGrupoFiltro(titulo, opciones, activa, tipo) {
  const botones = opciones.map(opcion => {
    const clase = opcion === activa ? "chip activo" : "chip";
    return `<button type="button" class="${clase}" data-tipo="${tipo}" data-valor="${esc(opcion)}">${esc(opcion)}</button>`;
  }).join("");

  return `
    <div class="grupo-filtro">
      <p class="filtro-titulo">${titulo}</p>
      <div class="chips">${botones}</div>
    </div>
  `;
}

function mostrarFiltros() {
  const categorias = ["Todas", ...valoresUnicos("categoria")];
  const talles = ["Todos", ...valoresUnicos("talle")];

  document.getElementById("filtros").innerHTML =
    crearGrupoFiltro("Categoría", categorias, categoriaActiva, "categoria") +
    crearGrupoFiltro("Talle", talles, talleActivo, "talle");
}

function mostrarPrendas() {
  const visibles = prendas.filter(prenda => {
    const cumpleCategoria =
      categoriaActiva === "Todas" || prenda.categoria === categoriaActiva;
    const cumpleTalle =
      talleActivo === "Todos" || String(prenda.talle) === talleActivo;
    return cumpleCategoria && cumpleTalle;
  });

  const grilla = document.getElementById("grilla");

  if (visibles.length === 0) {
    grilla.innerHTML = `<p class="sin-resultados">No hay prendas con esos filtros. Probá con otra combinación.</p>`;
  } else {
    grilla.innerHTML = visibles.map(crearTarjeta).join("");
  }
}

// ====== PEDIDO POR WHATSAPP ======
function armarMensajeWhatsApp() {
  const items = carrito.map(buscarPrenda).filter(Boolean);
  const total = items.reduce((suma, prenda) => suma + prenda.precio, 0);

  const lineas = items.map((prenda, i) => {
    return `${i + 1}. ${prenda.nombre} - Talle ${prenda.talle} - ${formatearPrecio(prenda.precio)}`;
  });

  return [
    `Hola ${NOMBRE_TIENDA}! 🌸 Quiero hacer este pedido:`,
    "",
    ...lineas,
    "",
    `Subtotal: ${formatearPrecio(total)}`,
    `Total: ${formatearPrecio(total)}`,
    "",
    "¿Me confirmás la disponibilidad y cómo coordinamos el pago y la entrega? ¡Gracias!"
  ].join("\n");
}

function enviarPedido() {
  if (carrito.length === 0) return;

  const mensaje = armarMensajeWhatsApp();
  const enlace = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;

  window.open(enlace, "_blank");
}

// ====== BOTÓN FLOTANTE DE WHATSAPP (consultas rápidas) ======
// Usa el mismo número de arriba, así queda en un solo lugar
function prepararBotonWhatsApp() {
  const boton = document.getElementById("whatsapp-flotante");
  if (!boton) return;

  const mensaje = `Hola ${NOMBRE_TIENDA}! 🌸 Tengo una consulta.`;
  boton.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

// ====== ESCUCHAR CLICS ======
// Filtros
document.getElementById("filtros").addEventListener("click", function (evento) {
  const boton = evento.target.closest(".chip");
  if (!boton) return;

  if (boton.dataset.tipo === "categoria") {
    categoriaActiva = boton.dataset.valor;
  } else {
    talleActivo = boton.dataset.valor;
  }

  mostrarFiltros();
  mostrarPrendas();
});

// Tarjetas: "Agregar al carrito" y abrir la ficha al tocar la foto o el nombre
document.getElementById("grilla").addEventListener("click", function (evento) {
  const agregar = evento.target.closest("[data-agregar]");
  if (agregar) {
    agregarAlCarrito(Number(agregar.dataset.agregar));
    return;
  }

  const ficha = evento.target.closest("[data-ficha]");
  if (ficha) {
    abrirFicha(Number(ficha.dataset.ficha));
  }
});

// Abrir la ficha con el teclado (Enter o espacio sobre la foto)
document.getElementById("grilla").addEventListener("keydown", function (evento) {
  if (evento.key !== "Enter" && evento.key !== " ") return;
  const ficha = evento.target.closest(".foto-caja[data-ficha]");
  if (!ficha) return;
  evento.preventDefault();
  abrirFicha(Number(ficha.dataset.ficha));
});

// Dentro de la ficha: cerrar, flechas, agregar, ver carrito
document.getElementById("cerrar-ficha").addEventListener("click", cerrarFicha);
document.getElementById("fondo-ficha").addEventListener("click", cerrarFicha);

document.getElementById("ficha").addEventListener("click", function (evento) {
  const flecha = evento.target.closest("[data-flecha]");
  if (flecha) {
    const pista = document.getElementById("ficha-pista");
    if (pista) {
      pista.scrollBy({ left: Number(flecha.dataset.flecha) * pista.clientWidth, behavior: "smooth" });
    }
    return;
  }

  const agregar = evento.target.closest("[data-ficha-agregar]");
  if (agregar) {
    agregarAlCarrito(Number(agregar.dataset.fichaAgregar));
    return;
  }

  if (evento.target.closest("[data-ficha-carrito]")) {
    cerrarFicha();
    abrirCarrito();
  }
});

// Tecla Escape cierra la ficha
document.addEventListener("keydown", function (evento) {
  if (evento.key === "Escape" && fichaAbierta !== null) {
    cerrarFicha();
  }
});

// Abrir y cerrar el panel del carrito
document.getElementById("abrir-carrito").addEventListener("click", abrirCarrito);
document.getElementById("cerrar-carrito").addEventListener("click", cerrarCarrito);
document.getElementById("fondo-carrito").addEventListener("click", cerrarCarrito);

// Botones dentro del panel (quitar, vaciar, finalizar)
document.getElementById("panel-carrito").addEventListener("click", function (evento) {
  const quitar = evento.target.closest("[data-quitar]");
  if (quitar) {
    quitarDelCarrito(Number(quitar.dataset.quitar));
    return;
  }

  if (evento.target.closest("#vaciar")) {
    vaciarCarrito();
    return;
  }

  if (evento.target.closest("#finalizar")) {
    enviarPedido();
  }
});

// ====== ARRANQUE ======
async function iniciar() {
  // El botón de WhatsApp funciona aunque las prendas no carguen
  prepararBotonWhatsApp();

  const grilla = document.getElementById("grilla");
  grilla.innerHTML = `<p class="sin-resultados">Cargando prendas…</p>`;

  try {
    await cargarPrendas();
  } catch (error) {
    console.error(error);
    grilla.innerHTML = `<p class="sin-resultados">No pudimos cargar las prendas en este momento. Probá de nuevo en unos minutos.</p>`;
    return;
  }

  cargarCarrito();
  mostrarFiltros();
  mostrarPrendas();
  mostrarCarrito();
}

iniciar();
