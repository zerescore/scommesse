/**
 * ZeroScoreV2 - UI Module (ui.js)
 */

const LIVE_STAT_KEYS = {
  shotsOnTarget: {
    home: [
      "shotsOnTargetHome",
      "shots_on_target_home",
      "shots_on_target_casa",
      "shotsOnTargetCasa",
      "shotOnTargetHome",
      "tiriInPortaCasa",
      "tiri_in_porta_casa",
      "tiri_porta_casa",
      "sot_home",
      "sotHome",
      "homeShotsOnTarget",
      "home_shots_on_target",
      "in_porta_casa"
    ],
    away: [
      "shotsOnTargetAway",
      "shots_on_target_away",
      "shots_on_target_trasferta",
      "shotsOnTargetTrasferta",
      "shotOnTargetAway",
      "tiriInPortaFuori",
      "tiriInPortaTrasferta",
      "tiri_in_porta_fuori",
      "tiri_in_porta_trasferta",
      "sot_away",
      "sotAway",
      "awayShotsOnTarget",
      "away_shots_on_target",
      "in_porta_fuori"
    ]
  },
  corners: {
    home: [
      "cornerHome",
      "cornersHome",
      "corner_casa",
      "corners_casa",
      "calciAngoloCasa",
      "calci_d_angolo_casa",
      "homeCorners",
      "home_corners"
    ],
    away: [
      "cornerAway",
      "cornersAway",
      "corner_away",
      "corner_trasferta",
      "corner_fuori",
      "corners_trasferta",
      "calciAngoloTrasferta",
      "calciAngoloFuori",
      "calci_d_angolo_trasferta",
      "homeAwayCorners",
      "awayCorners",
      "away_corners"
    ]
  },
  yellowCards: {
    home: [
      "yellowCardsHome",
      "yellow_cards_home",
      "gialliCasa",
      "gialli_casa",
      "ammonizioniCasa",
      "homeYellowCards",
      "home_yellow_cards"
    ],
    away: [
      "yellowCardsAway",
      "yellow_cards_away",
      "gialliFuori",
      "gialliTrasferta",
      "gialli_fuori",
      "gialli_trasferta",
      "ammonizioniTrasferta",
      "awayYellowCards",
      "away_yellow_cards"
    ]
  },
  redCards: {
    home: [
      "redCardsHome",
      "red_cards_home",
      "rossiCasa",
      "rossi_casa",
      "espulsioniCasa",
      "homeRedCards",
      "home_red_cards"
    ],
    away: [
      "redCardsAway",
      "red_cards_away",
      "rossiFuori",
      "rossiTrasferta",
      "rossi_fuori",
      "rossi_trasferta",
      "espulsioniTrasferta",
      "awayRedCards",
      "away_red_cards"
    ]
  }
};

function _toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function _digValueByPath(source, pathKey) {
  if (!source || typeof source !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(source, pathKey)) return source[pathKey];
  if (!pathKey.includes(".")) return undefined;

  let cursor = source;
  const chunks = pathKey.split(".");
  for (let i = 0; i < chunks.length; i += 1) {
    if (cursor && typeof cursor === "object" && chunks[i] in cursor) {
      cursor = cursor[chunks[i]];
    } else {
      return undefined;
    }
  }
  return cursor;
}

function _getFirstNumericValue(sourceObjects, keys) {
  for (const source of sourceObjects) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const raw = _digValueByPath(source, key);
      const parsed = _toNumberOrNull(raw);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

function _normalizeLiveStats(match) {
  const statContainers = [
    match,
    match?.stats,
    match?.statistics,
    match?.liveStats,
    match?.live_stats,
    match?.dettagliLive,
    match?.dettagli_live
  ];

  return {
    shotsOnTargetHome: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.shotsOnTarget.home),
    shotsOnTargetAway: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.shotsOnTarget.away),
    cornerHome: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.corners.home),
    cornerAway: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.corners.away),
    yellowCardsHome: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.yellowCards.home),
    yellowCardsAway: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.yellowCards.away),
    redCardsHome: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.redCards.home),
    redCardsAway: _getFirstNumericValue(statContainers, LIVE_STAT_KEYS.redCards.away)
  };
}

function _formatLiveValue(value) {
  return value === null ? "—" : String(value);
}

function _metricRow(label, home, away) {
  return `
    <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:6px 0;border-bottom:1px solid #e2e8f0;">
      <strong style="min-width:38px;text-align:right;color:#0f172a;">${_formatLiveValue(home)}</strong>
      <span style="flex:1;text-align:center;color:#334155;">${label}</span>
      <strong style="min-width:38px;text-align:left;color:#0f172a;">${_formatLiveValue(away)}</strong>
    </div>
  `;
}

export function _creaLiveCardCard(m, isPreferito) {
  const homeTeam = m?.homeTeam || m?.squadraCasa || m?.home || "Casa";
  const awayTeam = m?.awayTeam || m?.squadraTrasferta || m?.away || "Trasferta";
  const minute = m?.minute || m?.minuto || m?.time || "LIVE";
  const scoreHome = _toNumberOrNull(m?.scoreHome ?? m?.golCasa ?? m?.homeGoals);
  const scoreAway = _toNumberOrNull(m?.scoreAway ?? m?.golTrasferta ?? m?.awayGoals);

  const stats = _normalizeLiveStats(m);
  const favoriteBadge = isPreferito ? "⭐ " : "";

  return `
    <article style="background:#ffffff;border:1px solid #dbeafe;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${favoriteBadge}${homeTeam} vs ${awayTeam}</div>
        <div style="font-size:12px;font-weight:700;color:#2563eb;">${minute}</div>
      </header>
      <div style="text-align:center;font-size:20px;font-weight:800;color:#0f172a;margin-bottom:10px;">
        ${_formatLiveValue(scoreHome)} - ${_formatLiveValue(scoreAway)}
      </div>
      <section style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;">
        ${_metricRow("🎯 Tiri in Porta", stats.shotsOnTargetHome, stats.shotsOnTargetAway)}
        ${_metricRow("🚩 Calci d'Angolo", stats.cornerHome, stats.cornerAway)}
        ${_metricRow("🟨 Cartellini Gialli", stats.yellowCardsHome, stats.yellowCardsAway)}
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:6px 0;">
          <strong style="min-width:38px;text-align:right;color:#0f172a;">${_formatLiveValue(stats.redCardsHome)}</strong>
          <span style="flex:1;text-align:center;color:#334155;">🟥 Cartellini Rossi</span>
          <strong style="min-width:38px;text-align:left;color:#0f172a;">${_formatLiveValue(stats.redCardsAway)}</strong>
        </div>
      </section>
    </article>
  `;
}
