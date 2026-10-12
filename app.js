// Convierte 1490 en "$ 1.490"
function formatearPrecio(numero) {
  return "$ " + numero.toLocaleString("es-UY");
}

// Arma el HTML de una tarjeta a partir de los datos de una prenda
function crearTarjeta(prenda) {
  // Si hay foto, usamos <img>. Si no, un bloque de color.
  let foto;
  if (prenda.foto) {
    foto = `<img class="foto" src="${prenda.foto}" alt="${prenda.nombre}">`;
  } else {
    foto = `<div class="foto" style="background:${prenda.color}"></div>`;
  }

  // Si no está disponible, mostramos la etiqueta "Vendida"
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

// Muestra todas las prendas dentro de la grilla
function mostrarPrendas() {
  const grilla = document.getElementById("grilla");
  grilla.innerHTML = prendas.map(crearTarjeta).join("");
}

mostrarPrendas();