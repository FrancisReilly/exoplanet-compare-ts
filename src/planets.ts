//Gets Earth like planets from the NASA Exoplanet Archive and scores them against Earth

//The shape of one planet. Like a Java class with only fields
//"number | null" means the value may be missing i.e. NASA doesn't know it
export interface Planet {
  name: string;
  star: string;
  radius: number | null;        //Earths radii
  mass: number | null;          // Earth masses
  temperature: number | null;   // Kelvin
  starlight: number | null;     // how much light it gets, Earth = 1
  yearLength: number | null;    // days
  starTemperature: number | null; // Kelvin
  distanceLightYears: number | null;
  discoveryYear: number | null;
  esi: number;                  // Earth Similarity Index, 1 = identical to Earth
}

// Earth's own values for the comparison table
export const EARTH: Planet = {
  name: "Earth",
  star: "Sun",
  radius: 1,
  mass: 1,
  temperature: 255,
  starlight: 1,
  yearLength: 365.25,
  starTemperature: 5772,
  distanceLightYears: 0,
  discoveryYear: null,
  esi: 1,
};

//NASA's API takes an SQL like query (called ADQL).
// "Earth-like" = 0.5–1.8 times Earth's size, and 0.25–2 times Earth's starlight.
const QUERY = `
  select pl_name, hostname, pl_rade, pl_bmasse, pl_eqt, pl_insol,
         pl_orbper, st_teff, sy_dist, disc_year
  from pscomppars
  where pl_rade between 0.5 and 1.8
    and pl_insol between 0.25 and 2.0
`;

const NASA_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";

//Earth Similarity Index (simplified), using size and starlight.
function earthSimilarity(radius: number, starlight: number): number {
  const sizeDiff = ((radius - 1) / (radius + 1)) ** 2;
  const lightDiff = ((starlight - 1) / (starlight + 1)) ** 2;
  return 1 - Math.sqrt((sizeDiff + lightDiff) / 2);
}

//Remember the list for an hour so we don't ask NASA on every page load
let cachedPlanets: Planet[] = [];
let cachedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

export async function getPlanets(): Promise<Planet[]> {
  if (cachedPlanets.length > 0 && Date.now() - cachedAt < ONE_HOUR) {
    return cachedPlanets;
  }

  const url = NASA_URL + "?format=json&query=" + encodeURIComponent(QUERY.trim());
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("NASA returned status " + response.status);
  }
  const rows: any[] = await response.json();

  const planets: Planet[] = [];
  for (const row of rows) {
    //Skip planets missing the two values the score needs.
    if (row.pl_rade == null || row.pl_insol == null) continue;

    planets.push({
      name: row.pl_name,
      star: row.hostname,
      radius: row.pl_rade,
      mass: row.pl_bmasse,
      temperature: row.pl_eqt,
      starlight: row.pl_insol,
      yearLength: row.pl_orbper,
      starTemperature: row.st_teff,
      distanceLightYears: row.sy_dist == null ? null : row.sy_dist * 3.26156, //parsecs → light-years
      discoveryYear: row.disc_year,
      esi: earthSimilarity(row.pl_rade, row.pl_insol),
    });
  }

  // Most Earth like first.
  planets.sort((a, b) => b.esi - a.esi);

  cachedPlanets = planets;
  cachedAt = Date.now();
  return planets;
}

// One row of the comparison table already formatted as text.
export interface ComparisonRow {
  label: string;
  earth: string;
  planet: string;
}

//Turns a number into text like "1.02 × Earth", or "unknown" if it's missing.
function show(value: number | null, decimals: number, unit: string): string {
  return value == null ? "unknown" : `${value.toFixed(decimals)} ${unit}`;
}

export function compareWithEarth(p: Planet): ComparisonRow[] {
  return [
    { label: "Size (radius)",      earth: show(EARTH.radius, 2, "× Earth"),         planet: show(p.radius, 2, "× Earth") },
    { label: "Mass",               earth: show(EARTH.mass, 2, "× Earth"),           planet: show(p.mass, 2, "× Earth") },
    { label: "Starlight received", earth: show(EARTH.starlight, 2, "× Earth"),      planet: show(p.starlight, 2, "× Earth") },
    { label: "Temperature",        earth: show(EARTH.temperature, 0, "K"),          planet: show(p.temperature, 0, "K") },
    { label: "Year length",        earth: show(EARTH.yearLength, 1, "days"),        planet: show(p.yearLength, 1, "days") },
    { label: "Star temperature",   earth: show(EARTH.starTemperature, 0, "K"),      planet: show(p.starTemperature, 0, "K") },
  ];
}
