// The web server. Start it with:  npm start

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { compareWithEarth, getPlanets, Planet } from "./planets.ts";

const PORT = 3000;
const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf-8");
const template = fileURLToPath(new URL("../views/page.ejs", import.meta.url));

const server = createServer(async (request, response) => {
  //Work out which page was asked for e.g. "/?planet=TRAPPIST-1 e"
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/style.css") {
    response.writeHead(200, { "Content-Type": "text/css" });
    response.end(css);
    return;
  }

  if (url.pathname !== "/") {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }

  //The values the template can use
  let planets: Planet[] = [];
  let selected: Planet | undefined;
  let error = "";

  try {
    planets = await getPlanets();
    const chosenName = url.searchParams.get("planet");
    //Show the chosen planet or the most Earth like one if none was chosen
    selected = planets.find((p) => p.name === chosenName) ?? planets[0];
  } catch (err) {
    console.error(err);
    error = "Couldn't reach the NASA Exoplanet Archive. Try again in a minute.";
  }

  const html = await ejs.renderFile(template, {
    planets,
    selected,
    error,
    rows: selected ? compareWithEarth(selected) : [],
    circleSize: Math.round(80 * (selected?.radius ?? 1)), //Earth's circle is 80px
  });

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
