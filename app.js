// ====== ESTADO: qué filtros están activos ======
let categoriaActiva = "Todas";
let talleActivo = "Todos";

// Convierte 1490 en "$ 1.490"
function formatearPrecio(numero) {
  return "$ " + numero.toLocaleString("es-UY");
}

// Arma el HTML de una tarjeta a partir de los datos de una prenda
function crearTarjeta(prenda) {
  let foto;
  if (prenda.foto) {
    foto = `<img class="foto" src="${prenda.foto}" alt="${prenda.nombre}">`;
  } else {
    foto = `<div class="foto" style="background:${prenda.color}"></div>`;
  }

  let etiqueta = "";
  let claseVendida = "";
  if (!prenda.disponible) {
    etiqueta = `<span class="etiqueta-vendida">Vendida</span>`;
    claseVendida = "vendida";
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
    </article>
  `;
}

// Devuelve los valores distintos de un campo, sin repetir
// Ejemplo: valoresUnicos("categoria") -> ["Vestir", "Vestidos", "Pantalones"]
function valoresUnicos(campo) {
  return [...new Set(prendas.map(p => String(p[campo])))];
}

// Arma un grupo de botones (una fila de "chips")
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

// Dibuja los dos grupos de filtros
function mostrarFiltros() {
  const categorias = ["Todas", ...valoresUnicos("categoria")];
  const talles = ["Todos", ...valoresUnicos("talle")];

  document.getElementById("filtros").innerHTML =
    crearGrupoFiltro("Categoría", categorias, categoriaActiva, "categoria") +
    crearGrupoFiltro("Talle", talles, talleActivo, "talle");
}

// Dibuja las prendas que cumplen con los filtros activos
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

// Cuando se toca un botón de filtro
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

// Arranque
mostrarFiltros();
mostrarPrendas();