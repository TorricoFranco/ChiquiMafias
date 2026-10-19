export const teamMapping: Record<string, string> = {
  "463.webp": "Aldosivi",
  "458.webp": "Argentinos Juniors",
  "455.webp": "Atlético Tucumán",
  "449.webp": "Banfield",
  "2432.webp": "Barracas Central",
  "440.webp": "Belgrano",
  "451.webp": "Boca Juniors",
  "1065.webp": "Central Córdoba",
  "442.webp": "Defensa y Justicia",
  "476.webp": "Deportivo Riestra",
  "2424.webp": "Estudiantes de Río Cuarto",
  "450.webp": "Estudiantes",
  "434.webp": "Gimnasia y Esgrima La Plata",
  "1066.webp": "Gimnasia de Mendoza",
  "445.webp": "Huracán",
  "453.webp": "Independiente",
  "473.webp": "Independiente Rivadavia",
  "478.webp": "Instituto",
  "446.webp": "Lanús",
  "457.webp": "Newell's Old Boys",
  "1064.webp": "Platense",
  "436.webp": "Racing Club",
  "435.webp": "River Plate",
  "437.webp": "Rosario Central",
  "460.webp": "San Lorenzo",
  "474.webp": "Sarmiento",
  "456.webp": "Talleres",
  "452.webp": "Tigre",
  "441.webp": "Unión",
  "438.webp": "Vélez Sarsfield",
};

export interface Team {
  id: string;
  name: string;
  badgeUrl: string;
  tier: number;
}

export const getTeamsList = (): Team[] => {
  return Object.entries(teamMapping).map(([filename, name]) => {
    const tier2Teams = ["Estudiantes de Río Cuarto", "Gimnasia de Mendoza", "Aldosivi"];
    const tier = tier2Teams.includes(name) ? 2 : 1;
    return {
      id: filename.replace(".webp", ""),
      name: name,
      badgeUrl: `/escudos-api/${filename}`,
      tier: tier,
    };
  });
};