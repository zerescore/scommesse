/**
 * ZeroScoreV2 - App Bootstrap (app.js)
 */
import { DataModule } from "./data.js";
import { _creaLiveCardCard } from "./ui.js";

const appRoot = document.getElementById("app");

function renderLiveMatches(matches) {
  if (!appRoot) return;

  if (!Array.isArray(matches) || matches.length === 0) {
    appRoot.innerHTML = `
      <main style="padding:14px;">
        <h2 style="margin:0 0 8px;color:#0f172a;">ZeroScoreV2 Live</h2>
        <p style="margin:0;color:#475569;">Nessuna partita live disponibile al momento.</p>
      </main>
    `;
    return;
  }

  const cards = matches
    .map((m) => _creaLiveCardCard(m, Boolean(m?.isPreferito || m?.preferito)))
    .join("");

  appRoot.innerHTML = `
    <main style="padding:14px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">ZeroScoreV2 Live</h2>
      ${cards}
    </main>
  `;
}

async function bootstrap() {
  try {
    const liveMatches = await DataModule.fetchLiveScraping();
    renderLiveMatches(liveMatches);
  } catch (error) {
    if (appRoot) {
      appRoot.innerHTML = `
        <main style="padding:14px;">
          <h2 style="margin:0 0 8px;color:#0f172a;">ZeroScoreV2 Live</h2>
          <p style="margin:0;color:#b91c1c;">Errore nel caricamento dati live.</p>
        </main>
      `;
    }
    console.error("Errore bootstrap app:", error);
  }
}

bootstrap();
