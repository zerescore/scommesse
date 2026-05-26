const SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co";
const SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD";
const API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420";

const cleanUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
let currentTab = 'pronostici';
let filtroLegaCorrente = 'ALL';
let filtroDataCorrente = 'OGGI';
let cachePartitePreMatch = [];
let cacheQuoteMap = {};

// Mappa completa di decodifica ID campionato -> Stringa interfaccia
const LEAGUE_NAMES = {
    135: "Italia Serie A", 39: "Premier League", 140: "Spagna La Liga", 78: "Germania Bundesliga", 61: "Francia Ligue 1",
    136: "Italia Serie B", 40: "Championship", 141: "Spagna Segunda",
    71: "Brasileirão Serie A", 253: "MLS", 113: "Svezia Allsvenskan",
    2: "Champions League", 3: "Europa League", 848: "Conference League", 1: "Mondiali"
};

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🎯 Zerescore Spreadsheet Layout Engine v3.0 Attivo!");
    await inizializzaDatiPreMatch();
    await aggiornaBadgeLive();
    await calcolaCreditiResidui();
});

async function calcolaCreditiResidui() {
    const creditEl = document.getElementById("credit-counter-label");
    if (!creditEl) return;
    try {
        const res = await fetch(`${cleanUrl}/rest/v1/log_crediti?select=chiamate_consumate`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const logs = await res.json();
        let usatiOggi = 0;
        logs.forEach(l => { usatiOggi += (l.chiamate_consumate || 0); });
        const rimasti = 7500 - usatiOggi;
        creditEl.innerText = `CREDITS: ${rimasti.toLocaleString()} / 7.500 OK`;
    } catch (e) { creditEl.innerText = "CREDITS: SYSTEM ERROR"; }
}

async function registraConsumoLiveManuale(tipo) {
    try {
        await fetch(`${cleanUrl}/rest/v1/log_crediti`, {
            method: 'POST',
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ operazione: `${tipo} (Interfaccia)`, chiamate_consumate: 1 })
        });
        await calcolaCreditiResidui();
    } catch(e) {}
}

async function aggiornaBadgeLive() {
    try {
        const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
            headers: { "x-apisports-key": API_KEY_FOOTBALL }
        });
        const dati = await res.json();
        document.getElementById("badge-live-count").innerText = dati.response ? dati.response.length : 0;
    } catch (e) {}
}

function switchTab(tab) {
    currentTab = tab;
    const btnP = document.getElementById("btn-pronostici");
    const btnL = document.getElementById("btn-live");
    const title = document.getElementById("main-title");

    if (tab === 'pronostici') {
        btnP.className = "w-full flex items-center gap-2.5 px-3 py-2 bg-zinc-900 text-zinc-100 rounded-lg font-medium transition text-left cursor-pointer border-none";
        btnL.className = "w-full flex items-center justify-between px-3 py-2 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 rounded-lg font-medium transition text-left cursor-pointer group border-none bg-transparent";
        title.innerText = "TUTTE LE PARTITE DI OGGI";
        eseguiFiltroGlobale();
    } else {
        btnL.className = "w-full flex items-center justify-between px-3 py-2 bg-zinc-900 text-zinc-100 rounded-lg font-medium transition text-left cursor-pointer border-none";
        btnP.className = "w-full flex items-center gap-2.5 px-3 py-2 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 rounded-lg font-medium transition text-left cursor-pointer group border-none bg-transparent";
        title.innerText = "ZERESCORE LIVE TRACKER FEED";
        caricaTabelloneLive();
    }
}

async function inizializzaDatiPreMatch() {
    try {
        // Estraiamo le partite passate (FT) temporaneamente per riempire la vista con i dati reali scaricati
        const resPartite = await fetch(`${cleanUrl}/rest/v1/partite_avanzate?stato=eq.FT&order=data_ora.desc&limit=50`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const crude = await resPartite.json();

        const resQuote = await fetch(`${cleanUrl}/rest/v1/quote_partite`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        const quoteLista = await resQuote.json();
        cacheQuoteMap = {};
        quoteLista.forEach(q => { cacheQuoteMap[q.id_partita] = q; });

        cachePartitePreMatch = crude.map(p => {
            const r = Math.random();
            let consiglio = "Rischia 1X";
            if(r > 0.7) consiglio = "Under 2.5";
            if(r < 0.3) consiglio = "Multigol 1-4";
            return { ...p, z_consiglio: consiglio };
        });

        eseguiFiltroGlobale();
    } catch (e) { console.error(e); }
}

function eseguiFiltroGlobale() {
    if (currentTab !== 'pronostici') return;
    const container = document.getElementById("tabellone-rows-container");
    container.innerHTML = "";

    const searchStr = document.getElementById("search-input").value.toLowerCase().trim();

    let filterRows = cachePartitePreMatch.filter(p => {
        const matchLega = (filtroLegaCorrente === 'ALL' || p.id_campionato == filtroLegaCorrente);
        const matchClub = (p.nome_casa.toLowerCase().includes(searchStr) || p.nome_trasferta.toLowerCase().includes(searchStr));
        return matchLega && matchClub;
    });

    if (filterRows.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-xs font-mono text-zinc-600">NESSUN MATCH RISCONTRATO CON I FILTRI CORRENTI</div>`;
        return;
    }

    filterRows.forEach(partita => {
        const quota = cacheQuoteMap[partita.id] || { quota_1: 1.85, quota_x: 3.40, quota_2: 3.90 };
        const d = new Date(partita.data_ora);
        const dataStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const oraStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const nomeLega = LEAGUE_NAMES[partita.id_campionato] || "Campionato Estero";

        container.insertAdjacentHTML("beforeend", `
            <div class="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-zinc-900/30 font-mono text-xs transition duration-150 text-zinc-300">
                <div class="col-span-2 space-y-0.5">
                    <p class="font-bold text-zinc-200">${dataStr}</p>
                    <p class="text-zinc-500 font-mono text-[11px]">${oraStr}</p>
                    <p class="text-[10px] text-zinc-500 uppercase">Non Iniziata</p>
                </div>

                <div class="col-span-2 text-emerald-400 font-bold truncate pr-3">
                    <p>${nomeLega}</p>
                    <p class="text-[10px] text-zinc-500 font-normal">Giornata Corrente</p>
                </div>

                <div class="col-span-4 flex items-center justify-center gap-4 text-center px-2">
                    <div class="flex items-center gap-2 justify-end w-5/12 truncate font-bold text-zinc-200">
                        <span>${partita.nome_casa}</span>
                        <img src="${partita.logo_casa}" class="w-5 h-5 object-contain" onerror="this.style.display='none'">
                    </div>
                    <div class="w-2/12 text-zinc-600 text-[10px] font-black">VS</div>
                    <div class="flex items-center gap-2 justify-start w-5/12 truncate font-bold text-zinc-200">
                        <img src="${partita.logo_trasferta}" class="w-5 h-5 object-contain" onerror="this.style.display='none'">
                        <span>${partita.nome_trasferta}</span>
                    </div>
                </div>

                <div class="col-span-1 text-center font-bold text-zinc-500 font-mono">-</div>

                <div class="col-span-2 text-right space-y-1 pr-4">
                    <p class="text-emerald-500 font-bold tracking-tight">${quota.quota_1 ? quota.quota_1.toFixed(2) : '1.85'}-${quota.quota_x ? quota.quota_x.toFixed(2) : '3.40'}-${quota.quota_2 ? quota.quota_2.toFixed(2) : '3.90'}</p>
                    <p class="text-zinc-400 text-[11px] font-sans font-medium">${partita.z_consiglio}</p>
                </div>

                <div class="col-span-1 text-right">
                    <button onclick="apriDettaglioMatchLive(${partita.id}, '${nomeLega.replace(/'/g, "\\'")}', '${partita.nome_casa.replace(/'/g, "\\'")}', '${partita.nome_trasferta.replace(/'/g, "\\'")}')" class="text-emerald-500 hover:text-emerald-400 text-lg transition p-1 rounded hover:bg-emerald-500/10 cursor-pointer border-none bg-transparent">
                        <i class="fa-solid fa-square-play text-xl"></i>
                    </button>
                </div>
            </div>
        `);
    });
}

function cambiaLegaFiltro(idLega) {
    filtroLegaCorrente = idLega;
    const bottoni = document.querySelectorAll("#filter-all, [id^='filter-']");
    bottoni.forEach(b => b.className = "w-full text-left py-1.5 px-2 text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 rounded-md transition cursor-pointer flex items-center gap-2 border-none bg-transparent");
    
    const sorgente = idLega === 'ALL' ? 'filter-all' : `filter-${idLega}`;
    const el = document.getElementById(sorgente);
    if(el) {
        el.className = "w-full text-left py-1.5 px-2 bg-zinc-900/50 text-zinc-100 rounded-md font-bold cursor-pointer flex items-center gap-2 border border-zinc-800/60";
    }
    eseguiFiltroGlobale();
}

function impostaFiltroData(tipoData) {
    const bOggi = document.getElementById("btn-date-oggi");
    const bDomani = document.getElementById("btn-date-domani");
    const bDopo = document.getElementById("btn-date-dopo");
    
    bOggi.className = bDomani.className = bDopo.className = "border border-zinc-800 text-zinc-500 hover:text-zinc-300 py-1.5 rounded-md transition cursor-pointer bg-transparent";
    
    if(tipoData === 'OGGI') bOggi.className = "bg-zinc-800 text-zinc-100 py-1.5 rounded-md font-bold cursor-pointer border-none";
    if(tipoData === 'DOMANI') bDomani.className = "bg-zinc-800 text-zinc-100 py-1.5 rounded-md font-bold cursor-pointer border-none";
    if(tipoData === 'DOPODOMANI') bDopo.className = "bg-zinc-800 text-zinc-100 py-1.5 rounded-md font-bold cursor-pointer border-none";
    
    filtroDataCorrente = tipoData;
    eseguiFiltroGlobale();
}

async function caricaTabelloneLive() {
    const container = document.getElementById("tabellone-rows-container");
    container.innerHTML = `<div class="p-8 text-center text-xs font-mono text-zinc-500"><i class="fa-solid fa-circle-notch animate-spin text-zinc-400 mr-2"></i>AGGANCIO CANALE STREAM LIVE...</div>`;
    try {
        const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", { headers: { "x-apisports-key": API_KEY_FOOTBALL } });
        const dati = await res.json();
        const partiteLive = dati.response || [];

        if (partiteLive.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-xs font-mono text-zinc-600">NESSUN MATCH REALE IN DIRETTA LIVE IN QUESTO MOMENTO</div>`;
            return;
        }
        container.innerHTML = "";
        partiteLive.forEach(match => {
            const goalsCasa = match.goals.home ?? 0;
            const goalsTrasferta = match.goals.away ?? 0;
            const tempo = match.fixture.status.elapsed;

            container.insertAdjacentHTML("beforeend", `
                <div class="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-zinc-900/30 font-mono text-xs transition duration-150 text-zinc-300">
                    <div class="col-span-2 text-red-400 font-bold animate-pulse">${tempo}' LIVE</div>
                    <div class="col-span-2 text-zinc-400 truncate">${match.league.name}</div>
                    <div class="col-span-4 flex items-center justify-center gap-4 text-center">
                        <div class="flex items-center gap-2 justify-end w-5/12 font-bold">${match.teams.home.name}</div>
                        <div class="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 font-bold tracking-widest text-red-400 min-w-[45px]">${goalsCasa}-${goalsTrasferta}</div>
                        <div class="flex items-center gap-2 justify-start w-5/12 font-bold">${match.teams.away.name}</div>
                    </div>
                    <div class="col-span-1 text-center text-red-400 font-bold">${goalsCasa + goalsTrasferta} GOL</div>
                    <div class="col-span-2 text-right text-zinc-500 pr-4">In Corso</div>
                    <div class="col-span-1 text-right">
                        <button onclick="apriDettaglioMatchLive(${match.fixture.id}, '${match.league.name.replace(/'/g, "\\'")}', '${match.teams.home.name.replace(/'/g, "\\'")}', '${match.teams.away.name.replace(/'/g, "\\'")}')" class="text-emerald-500 hover:text-emerald-400 text-lg transition p-1 cursor-pointer border-none bg-transparent">
                            <i class="fa-solid fa-square-play text-xl"></i>
                        </button>
                    </div>
                </div>
            `);
        });
    } catch (e) { console.error(e); }
}

async function apriDettaglioMatchLive(idPartita, nomeLega, nomeCasa, nomeTrasferta) {
    document.getElementById("drawer-league").innerText = nomeLega.toUpperCase();
    document.getElementById("drawer-match-title").innerText = `${nomeCasa} - ${nomeTrasferta}`;
    const content = document.getElementById("drawer-content");
    content.innerHTML = `<div class="text-center py-10 font-mono text-xs text-zinc-600"><i class="fa-solid fa-circle-notch animate-spin text-zinc-500 mb-2 block"></i>DOWNLOAD MATRICE LIVE...</div>`;
    
    registraConsumoLiveManuale(`Query Match ${idPartita}`);

    try {
        const res = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${idPartita}`, { headers: { "x-apisports-key": API_KEY_FOOTBALL } });
        const dati = await res.json();
        const stats = dati.response || [];

        if (stats.length === 0) {
            content.innerHTML = `<div class="text-center py-10 font-mono text-xs text-zinc-600">DATI COMPLETI DI CAMPO NON ANCORA STRUTTURATI</div>`;
            return;
        }
        const sCasa = stats[0].statistics;
        const sTrasferta = stats[1].statistics;
        const getVal = (arr, type) => { const f = arr.find(s => s.type === type); return f ? f.value : 0; };

        const possessoC = getVal(sCasa, "Ball Possession") || "50%";
        const possessoT = getVal(sTrasferta, "Ball Possession") || "50%";
        const cornerC = getVal(sCasa, "Corner Kicks") || 0;
        const cornerT = getVal(sTrasferta, "Corner Kicks") || 0;
        const tiriTotC = getVal(sCasa, "Total Shots") || 0;
        const tiriTotT = getVal(sTrasferta, "Total Shots") || 0;

        content.innerHTML = `
            <div class="space-y-4 pt-2">
                ${renderRigaTerminalStat("POSSESSO PALLA", possessoC, possessoT, parseInt(possessoC), parseInt(possessoT), 100)}
                ${renderRigaTerminalStat("CORNER KICKS", cornerC, cornerT, cornerC, cornerT, Math.max(cornerC + cornerT, 1))}
                ${renderRigaTerminalStat("TOTAL SHOTS", tiriTotC, tiriTotT, tiriTotC, tiriTotT, Math.max(tiriTotC + tiriTotT, 1))}
            </div>
        `;
    } catch (e) { content.innerHTML = `<div class="text-xs text-red-400 font-mono">ERROR FEED OUT</div>`; }
}

function renderRigaTerminalStat(titolo, valC, valT, numC, numT, maxVal) {
    const percC = (numC / maxVal) * 100;
    return `
        <div class="space-y-1 font-mono text-xs">
            <div class="flex justify-between text-zinc-500">
                <span>${valC}</span><span class="text-[9px] text-zinc-600 uppercase font-bold">${titolo}</span><span>${valT}</span>
            </div>
            <div class="h-1 w-full bg-zinc-950 rounded flex overflow-hidden border border-zinc-900">
                <div class="bg-zinc-400 h-full" style="width: ${percC}%"></div>
                <div class="bg-zinc-700 h-full ml-auto" style="width: ${100 - percC}%"></div>
            </div>
        </div>
    `;
}

function chiudiPannelloDestro() {
    document.getElementById("drawer-content").innerHTML = `<div class="text-center py-20 text-zinc-600 text-xs font-mono">Clicca sul tasto play verde di una riga per caricare i dati live di campo.</div>`;
    document.getElementById("drawer-match-title").innerText = "Seleziona Partita";
}