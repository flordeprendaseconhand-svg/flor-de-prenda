// ====== ESTADO ======
let categoriaActiva = "Todas";
let talleActivo = "Todos";
let carrito = []; // guarda los "id" de las prendas elegidas

// ====== UTILIDADES ======
// Convierte 1490 en "$ 1.490"
function formatearPrecio(numero) {
  return "$ " + numero.toLocaleString("es-UY");
}

// Busca una prenda por su id
function buscarPrenda(id) {
  return prendas.find(p => p.id === id);
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
    miniatura = `<img class="item-foto" src="${prenda.foto}" alt="${prenda.nombre}">`;
  } else {
    miniatura = `<div class="item-foto" style="background:${prenda.color}"></div>`;
  }

  return `
    <div class="item-carrito">
      ${miniatura}
      <div class="item-info">
        <p class="item-nombre">${prenda.nombre}</p>
        <p class="detalle">Talle ${prenda.talle} · ${prenda.categoria}</p>
        <p class="precio">${formatearPrecio(prenda.precio)}</p>
      </div>
      <button class="item-quitar" type="button" data-quitar="${prenda.id}" aria-label="Quitar ${prenda.nombre}">Quitar</button>
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
    foto = `<img class="foto" src="${prenda.foto}" alt="${prenda.nombre}">`;
  } else {
    foto = `<div class="foto" style="background:${prenda.color}"></div>`;
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

  return `
    <article class="tarjeta ${claseVendida}">
      <div class="foto-caja">
        ${foto}
        ${etiqueta}
      </div>
      <h3>${prenda.nombre}</h3>
      <p class="detalle">Talle ${prenda.talle} · ${prenda.categoria}</p>
      <p class="precio">${formatearPrecio(prenda.precio)}</p>
      ${botonCompra}
    </article>
  `;
}

// ====== FILTROS ======
function valoresUnicos(campo) {
  return [...new Set(prendas.map(p => String(p[campo])))];
}

function crearGrupoFiltro(titulo, opciones, activa, tipo) {
  const botones = opciones.map(opcion => {
    const clase = opcion === activa ? "chip activo" : "chip";
    return `<button type="button" class="${clase}" data-tipo="${tipo}" data-valor="${opcion}">${opcion}</button>`;
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

// Botón "Agregar al carrito" de las tarjetas
document.getElementById("grilla").addEventListener("click", function (evento) {
  const boton = evento.target.closest("[data-agregar]");
  if (!boton) return;
  agregarAlCarrito(Number(boton.dataset.agregar));
});

// Abrir y cerrar el panel
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
    alert("Próximo paso: enviar el pedido por WhatsApp.");
  }
});

// ====== ARRANQUE ======
cargarCarrito();
mostrarFiltros();
mostrarPrendas();
mostrarCarrito();