const fs = require('fs');
const path = require('path');

// 1. Armá un mapa relacionando el nombre actual con el api_team_id
// Ejemplo: "nombre_actual.png": "id_de_la_api.png"
const teamMapping = {
  "aldosivi.webp": "463.webp",
  "argentinos_jrs.webp": "458.webp",
  "atletico_tucuman.webp": "455.webp",
  "banfield.webp": "449.webp",
  "barracas_central.webp": "2432.webp",
  "belgrano_cordoba.webp": "440.webp",
  "boca_juniors.webp": "451.webp",
  "central_cordoba_de_santiago.webp": "1065.webp",
  "defensa_y_justicia.webp": "442.webp",
  "deportivo_riestra.webp": "476.webp",
  "estudiantes_de_rio_cuarto.webp": "2424.webp",
  "estudiantes_l.p..webp": "450.webp",
  "gimnasia_l.p..webp": "434.webp",
  "gimnasia_m..webp": "1066.webp",
  "huracan.webp": "445.webp",
  "independiente.webp": "453.webp",
  "independ._rivadavia.webp": "473.webp",
  "instituto_cordoba.webp": "478.webp",
  "lanus.webp": "446.webp",
  "newells_old_boys.webp": "457.webp",
  "platense.webp": "1064.webp",
  "racing_club.webp": "436.webp",
  "river_plate.webp": "435.webp",
  "rosario_central.webp": "437.webp",
  "san_lorenzo.webp": "460.webp",
  "sarmiento_junin.webp": "474.webp",
  "talleres_cordoba.webp": "456.webp",
  "tigre.webp": "452.webp",
  "union_santa_fe.webp": "441.webp",
  "velez_sarsfield.webp": "438.webp"
}

// 2. Ruta a tu carpeta de imágenes (Ajustala según tu estructura, ej: public/teams)
const imagesDir = path.join(__dirname, 'public', 'escudos-api');

// 3. Ejecutamos el renombrado
Object.entries(teamMapping).forEach(([oldName, newName]) => {
  const oldPath = path.join(imagesDir, oldName);
  const newPath = path.join(imagesDir, newName);

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`✅ Renombrado exitoso: ${oldName} -> ${newName}`);
  } else {
    console.log(`❌ Archivo no encontrado: ${oldName}`);
  }
});