import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Star, ChevronDown, ChevronUp, Calendar, Trophy, ChevronRight, Menu } from 'lucide-react';

// --- CONNESSIONE SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qfshfjphjshrpwdnsekn.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- FUNZIONI DI SUPPORTO ---
const getNazioneInfo = (campionatoString) => {
  if (!campionatoString) return { nome: 'ALTRO', bandiera: '🏳️' };
  const nazioneEng = campionatoString.split('-')[0].trim().toLowerCase();
  const mappa = {
    'italy': { nome: 'ITALIA', bandiera: '🇮🇹' },
    'england': { nome: 'INGHILTERRA', bandiera: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'spain': { nome: 'SPAGNA', bandiera: '🇪🇸' },
    'germany': { nome: 'GERMANIA', bandiera: '🇩🇪' },
    'france': { nome: 'FRANCIA', bandiera: '🇫🇷' },
    'netherlands': { nome: 'OLANDA', bandiera: '🇳🇱' },
    'portugal': { nome: 'PORTOGALLO', bandiera: '🇵🇹' },
    'world': { nome: 'COPPE', bandiera: '🌍' },
    'europe': { nome: 'COPPE EUROPA', bandiera: '🇪🇺' }
  };
  return mappa[nazioneEng] || { nome: nazioneEng.toUpperCase(), bandiera: '🏳️' };
};

// --- ESTRATTORE FORMA BLINDATO (Anti-Schermo Bianco) ---
const parseFormaSicuro = (dati) => {
  if (!dati) return [];
  if (Array.isArray(dati)) return dati;
  try {
    if (typeof dati === 'string') {
      // Se è una stringa Postgres tipo "{V,P,S}"
      if (dati.trim().startsWith('{')) {
        return dati.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/["']/g, ''));
      }
      return JSON.parse(dati);
    }
  } catch (e) {
    console.error("Errore parsing forma (ignorato per sicurezza):", e);
    return [];
  }
  return [];
};

// --- ALGORITMO PREDITTIVO ---
const PESI_FORMA = [1.5, 1.2, 1.0, 0.8, 0.5];
const VALORI_ESITO = { 'V': 3, 'P': 1, 'S': 0 };
const MOLTIPLICATORI_CONTESTO = {
  'Derby': 1.4,
  'Lotta Titolo/Promozione': 1.3,
  'Lotta Salvezza': 1.2,
  'Partita Standard': 1.0
};

const calcolaFormIndex = (arrayEsiti) => {
  if (!arrayEsiti || arrayEsiti.length === 0) return 0;
  return arrayEsiti.reduce((totale, esito, index) => {
    const punti = VALORI_ESITO[esito?.toUpperCase()] ?? 0;
    const peso = PESI_FORMA[index] ?? 1.0;
    return totale + (punti * peso);
  }, 0);
};

const calcolaRatingAffidabilita = (formaCasa, formaTrasferta, contesto) => {
  const punteggioCasa = calcolaFormIndex(formaCasa);
  const punteggioTrasferta = calcolaFormIndex(formaTrasferta);
  const moltiplicatore = MOLTIPLICATORI_CONTESTO[contesto] || 1.0;
  const rating = (punteggioCasa - punteggioTrasferta) * moltiplicatore;
  return parseFloat(rating.toFixed(2));
};

export default function WorkstationDefinitiva() {
  const [partite, setPartite] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [mieiMatchIds, setMieiMatchIds] = useState([]);
  const [dataSelezionata, setDataSelezionata] = useState('OGGI'); 
  const [legaSelezionata, setLegaSelezionata] = useState(null); 
  const [nazioneEspansa, setNazioneEspansa] = useState(null); 
  const [matchEspanso, setMatchEspanso] = useState(null); 
  const [menuMobileAperto, setMenuMobileAperto] = useState(false);

  // Stati dei Filtri Superiori
  const [categoriaMercato, setCategoriaMercato] = useState('1X2');
  const [sottoCategoria, setSottoCategoria] = useState('TUTTE');
  const [tabAttivo, setTabAttivo] = useState('1 X 2');

  const oggi = new Date();
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1);
  const dopodomani = new Date(oggi); dopodomani.setDate(dopodomani.getDate() + 2);
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  const dateMap = { 'OGGI': formatDate(oggi), 'DOMANI': formatDate(domani), 'DOPODOMANI': formatDate(dopodomani) };

  useEffect(() => {
    async function fetchDati() {
      try {
        const { data, error } = await supabase.from('partita_live').select('*').order('data_match', { ascending: true });
        if (error) throw error;
        
        const partiteElaborate = (data || []).map(match => {
          const esitiCasa = parseFormaSicuro(match.forma_casa);
          const esitiTrasferta = parseFormaSicuro(match.forma_trasferta);
          const contesto = match.contesto_match || 'Partita Standard';
          return {
            ...match,
            ratingFinale: calcolaRatingAffidabilita(esitiCasa, esitiTrasferta, contesto)
          };
        });

        partiteElaborate.sort((a, b) => Math.abs(b.ratingFinale || 0) - Math.abs(a.ratingFinale || 0));

        setPartite(partiteElaborate);
        setLoading(false);
      } catch (err) {
        console.error("Errore database:", err);
        setLoading(false);
      }
    }
    fetchDati();
    const interval = setInterval(fetchDati, 30000); 
    return () => clearInterval(interval);
  }, []);

  const toggleMioMatch = (e, matchId) => {
    e.stopPropagation(); 
    setMieiMatchIds(prev => prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]);
  };

  const legheFisse = [
    "England - Premier League", "Italy - Serie A", "Italy - Serie B",
    "Spain - La Liga", "Germany - Bundesliga", "France - Ligue 1",
    "Netherlands - Eredivisie", "Portugal - Primeira Liga",
    "World - UEFA Champions League", "World - UEFA Europa League"
  ];

  const campionatiPerNazione = {};
  const aggiungiLegaMenu = (nomeCampionato) => {
    if (!nomeCampionato) return;
    const info = getNazioneInfo(nomeCampionato);
    if (!campionatiPerNazione[info.nome]) {
      campionatiPerNazione[info.nome] = { bandiera: info.bandiera, leghe: new Set() };
    }
    campionatiPerNazione[info.nome].leghe.add(nomeCampionato);
  };
  legheFisse.forEach(aggiungiLegaMenu);
  partite.forEach(m => aggiungiLegaMenu(m.campionato));

  let partiteBase = legaSelezionata 
    ? partite.filter(m => m.campionato === legaSelezionata) 
    : partite.filter(m => m.data_match === dateMap[dataSelezionata]);

  let partiteFiltrate = partiteBase;
  if (categoriaMercato === '1X2') {
    if (sottoCategoria === 'STAT_1') partiteFiltrate = partiteBase.filter(m => m.perc_1 > m.perc_x && m.perc_1 > m.perc_2);
    else if (sottoCategoria === 'STAT_X') partiteFiltrate = partiteBase.filter(m => m.perc_x >= m.perc_1 && m.perc_x >= m.perc_2);
    else if (sottoCategoria === 'STAT_2') partiteFiltrate = partiteBase.filter(m => m.perc_2 > m.perc_1 && m.perc_2 > m.perc_x);
    else if (sottoCategoria === 'DOPPIA_CHANCE') partiteFiltrate = partiteBase.filter(m => (m.perc_1 + m.perc_x > 75) || (m.perc_2 + m.perc_x > 75));
    else if (sottoCategoria === 'PRIMO_TEMPO') partiteFiltrate = partiteBase.filter(m => m.perc_over_05_1h > 70 || m.perc_1 > 50 || m.perc_2 > 50);
  }
  
  const mieiMatchList = partite.filter(m => mieiMatchIds.includes(m.id));

  if (loading) return <div style={{ background: '#020617', color: '#38bdf8', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Caricamento Database Quantitativo...</div>;

  return (
    <>
      <style>{`
        .app-layout { display: flex; flex-direction: row; height: 100vh; overflow: hidden; font-family: system-ui, sans-serif; background-color: #020617; color: #f8fafc; }
        .sidebar { width: 320px; background-color: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; height: 100%; position: relative; z-index: 20; }
        .main-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .top-bar-mobile { display: none; padding: 15px 20px; background-color: #0f172a; border-bottom: 1px solid #1e293b; align-items: center; justify-content: space-between; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .plancia-header { display: flex; justify-content: space-between; align-items: center; }
        .filter-buttons { display: flex; gap: 10px; }
        .team-score-block { display: flex; align-items: center; gap: 15px; }

        @media (max-width: 900px) {
          .app-layout { flex-direction: column; overflow: auto; }
          .top-bar-mobile { display: flex; }
          .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid #1e293b; display: ${menuMobileAperto ? 'flex' : 'none'}; max-height: 50vh; overflow-y: auto; }
          .main-panel { height: auto; overflow: visible; }
          .filter-buttons { flex-wrap: wrap; }
          .filter-buttons button { flex: 1 1 40%; font-size: 11px !important; padding: 10px !important; }
          .stats-grid { grid-template-columns: 1fr; }
          .plancia-header { flex-direction: column; text-align: center; gap: 20px; }
          .team-score-block { flex-direction: column; align-items: flex-start; gap: 10px; }
          .tab-btn { font-size: 11px !important; padding: 12px 5px !important; }
          .header-desktop-info { display: flex; flex-direction: column; gap: 10px; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      <div className="app-layout">
        
        {/* BARRA SUPERIORE MOBILE (Visibile solo da telefono) */}
        <div className="top-bar-mobile">
          <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#fff', margin: 0 }}>ZERESCORE <span style={{ color: '#38bdf8' }}>PRO</span></h1>
          <button onClick={() => setMenuMobileAperto(!menuMobileAperto)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
            <Menu size={24} />
          </button>
        </div>

        {/* PANNELLO LATERALE */}
        <div className="sidebar">
          <div className="hide-mobile" style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#fff', margin: 0 }}>ZERESCORE <span style={{ color: '#38bdf8' }}>PRO</span></h1>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <Star size={14} style={{ marginRight: '6px', color: '#facc15' }} /> I MIEI MATCH ({mieiMatchList.length})
              </h3>
              {mieiMatchList.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px' }}>Nessun evento.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mieiMatchList.map(m => (
                    <div key={`fav-${m.id}`} style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px', fontSize: '12px', borderLeft: '3px solid #facc15' }}>
                      <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>{m.campionato}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{m.home_team} - {m.away_team}</strong><span style={{ color: '#38bdf8' }}>{m.minute}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <Calendar size={14} style={{ marginRight: '6px' }} /> MATCH DEL GIORNO
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[{ id: 'OGGI', label: `OGGI` }, { id: 'DOMANI', label: `DOMANI` }, { id: 'DOPODOMANI', label: `DOPODOMANI` }].map(filtro => (
                  <button 
                    key={filtro.id}
                    onClick={() => { setDataSelezionata(filtro.id); setLegaSelezionata(null); setMatchEspanso(null); setNazioneEspansa(null); if(window.innerWidth < 900) setMenuMobileAperto(false); }}
                    style={{
                      padding: '10px 15px', textAlign: 'left', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: dataSelezionata === filtro.id && !legaSelezionata ? '#38bdf8' : '#1e293b',
                      color: dataSelezionata === filtro.id && !legaSelezionata ? '#0f172a' : '#cbd5e1'
                    }}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <Trophy size={14} style={{ marginRight: '6px' }} /> CAMPIONATI
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {Object.keys(campionatiPerNazione).sort().map(nazioneNome => {
                  const info = campionatiPerNazione[nazioneNome];
                  const isEspanso = nazioneEspansa === nazioneNome;
                  return (
                    <div key={nazioneNome}>
                      <button
                        onClick={() => setNazioneEspansa(isEspanso ? null : nazioneNome)}
                        style={{ width: '100%', padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isEspanso ? '#1e293b' : 'transparent', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '18px' }}>{info.bandiera}</span><span style={{ fontSize: '13px', fontWeight: 'bold' }}>{nazioneNome}</span></div>
                        {isEspanso ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                      </button>
                      {isEspanso && (
                        <div style={{ display: 'flex', flexDirection: 'column', background: '#0b1120', padding: '5px 0', borderLeft: '2px solid #38bdf8', marginLeft: '10px', marginBottom: '5px' }}>
                          {Array.from(info.leghe).sort().map(lega => (
                            <button
                              key={lega}
                              onClick={() => { setLegaSelezionata(lega); setMatchEspanso(null); setCategoriaMercato('1X2'); setSottoCategoria('TUTTE'); if(window.innerWidth < 900) setMenuMobileAperto(false); }}
                              style={{ padding: '10px 15px', textAlign: 'left', background: 'transparent', color: legaSelezionata === lega ? '#38bdf8' : '#cbd5e1', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: legaSelezionata === lega ? 'bold' : 'normal', display: 'flex', alignItems: 'center' }}
                            >
                              {legaSelezionata === lega && <ChevronRight size={12} style={{ marginRight: '5px' }} />}
                              {lega.split('-').pop().trim()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* PANNELLO CENTRALE */}
        <div className="main-panel">
          
          {/* BARRA SUPERIORE */}
          <div style={{ backgroundColor: '#0b1120', borderBottom: '2px solid #1e293b', padding: '20px', zIndex: 10 }}>
              <div className="header-desktop-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#fff', textTransform: 'uppercase' }}>
                    {legaSelezionata ? `Analisi: ${legaSelezionata}` : `Eventi: ${dataSelezionata}`}
                  </h2>
                  <p style={{ color: '#4ade80', margin: '5px 0 0 0', fontSize: '13px', fontWeight: 'bold' }}>{partiteFiltrate.length} match trovati</p>
                </div>
                <div className="hide-mobile" style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#0f172a', padding: '6px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginLeft: '10px' }}>SEZIONE:</span>
                  <button style={{ padding: '8px 24px', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: '#38bdf8', color: '#0f172a' }}>
                    1X2 & ESITI FINALI
                  </button>
                </div>
              </div>

              <div className="filter-buttons">
                {[ { id: 'TUTTE', label: 'TUTTI', icon: '🌍' }, { id: 'STAT_1', label: 'STAT 1', icon: '🏠' }, { id: 'STAT_X', label: 'STAT X', icon: '⚖️' }, { id: 'STAT_2', label: 'STAT 2', icon: '✈️' }, { id: 'DOPPIA_CHANCE', label: 'DOPPIA', icon: '🛡️' }, { id: 'PRIMO_TEMPO', label: '1° TEMPO', icon: '⏱️' } ].map(sub => (
                  <button 
                    key={sub.id} onClick={() => setSottoCategoria(sub.id)}
                    style={{ flex: 1, padding: '12px 5px', fontSize: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: sottoCategoria === sub.id ? '#10b981' : '#1e293b', color: sottoCategoria === sub.id ? '#0f172a' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span style={{ fontSize: '14px' }}>{sub.icon}</span> <span className="hide-mobile">{sub.label}</span>
                  </button>
                ))}
              </div>
          </div>

          {/* LISTA MATCH E PLANCIA VERDE */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {partiteFiltrate.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#475569', border: '1px dashed #334155', borderRadius: '8px' }}>Nessun match disponibile.</div>
              ) : (
                Object.keys(partiteFiltrate.reduce((acc, m) => {
                    const data = m.data_match || "Data Sconosciuta";
                    if (!acc[data]) acc[data] = []; acc[data].push(m); return acc;
                }, {})).sort().map(dataGiornata => (
                  <div key={dataGiornata} style={{ marginBottom: '10px' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '10px 15px', borderRadius: '4px', marginBottom: '12px', borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center' }}>
                      <Calendar size={16} color="#10b981" style={{ marginRight: '8px' }} />
                      <h3 style={{ margin: 0, fontSize: '14px', color: '#fff', textTransform: 'uppercase' }}>Match del {dataGiornata}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {partiteFiltrate.filter(m => m.data_match === dataGiornata).map(match => {
                        const isEspanso = matchEspanso === match.id;
                        const isPreferito = mieiMatchIds.includes(match.id);
                        const isFinita = match.status === 'FINITA';
                        const badgeColor = (match.ratingFinale || 0) > 0 ? '#4ade80' : (match.ratingFinale || 0) < 0 ? '#f87171' : '#94a3b8';
                        
                        return (
                          <div key={match.id} style={{ backgroundColor: '#0f172a', border: `1px solid ${isEspanso ? '#16a34a' : '#1e293b'}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                            
                            {/* HEADER RIGA */}
                            <div 
                              onClick={() => { setMatchEspanso(isEspanso ? null : match.id); setTabAttivo('1 X 2'); }}
                              style={{ padding: '16px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: isEspanso ? '#0b1120' : 'transparent' }}
                            >
                              <div className="team-score-block">
                                <button onClick={(e) => toggleMioMatch(e, match.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px 0 0' }}>
                                  <Star size={20} fill={isPreferito ? '#facc15' : 'transparent'} color={isPreferito ? '#facc15' : '#64748b'} />
                                </button>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{match.data_match} • {match.campionato}</div>
                                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: isFinita ? '#94a3b8' : '#fff', marginTop: '4px' }}>
                                    {match.home_team} <span style={{ color: isFinita ? '#64748b' : '#38bdf8', padding: '0 5px' }}>{match.home_score} - {match.away_score}</span> {match.away_team}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ textAlign: 'right', borderRight: '1px solid #1e293b', paddingRight: '10px' }}>
                                  <div style={{ fontSize: '10px', color: '#64748b' }}>RATING</div>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: badgeColor }}>
                                    {(match.ratingFinale || 0) > 0 ? '+' : ''}{match.ratingFinale || 0}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }} className="hide-mobile">
                                  <div style={{ fontSize: '10px', color: '#64748b' }}>STATO</div>
                                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: match.status === 'LIVE' ? '#ef4444' : (isFinita ? '#64748b' : '#10b981') }}>
                                    {match.status}
                                  </div>
                                </div>
                                {isEspanso ? <ChevronUp color="#64748b" /> : <ChevronDown color="#64748b" />}
                              </div>
                            </div>

                            {/* PLANCIA VERDE ESPANSA */}
                            {isEspanso && (
                              <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderTop: '1px solid #1e293b' }}>
                                
                                <div className="plancia-header" style={{ backgroundColor: '#0f5132', padding: '20px', color: '#fff' }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#14532d', borderRadius: '50%', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #22c55e', fontSize: '16px' }}>🏠</div>
                                    <div style={{ fontSize: '14px', fontWeight: '900' }}>{match.home_team}</div>
                                  </div>

                                  <div style={{ textAlign: 'center', padding: '0 10px' }}>
                                    <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', letterSpacing: '1px' }}>{match.campionato}</div>
                                    <div style={{ margin: '10px 0', padding: '8px 0', borderTop: '1px solid #166534', borderBottom: '1px solid #166534', fontSize: '14px', fontWeight: '900' }}>
                                      {isFinita ? `Terminata ${match.home_score} - ${match.away_score}` : 'Non Iniziata'}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#14532d', borderRadius: '50%', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #38bdf8', fontSize: '16px' }}>✈️</div>
                                    <div style={{ fontSize: '14px', fontWeight: '900' }}>{match.away_team}</div>
                                  </div>
                                </div>

                                {/* BARRA TAB */}
                                <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#fff' }}>
                                  {['1 X 2', 'GG/NG', 'U/O 2.5', 'CORNER & EXTRA'].map((tab) => {
                                    const isActive = tabAttivo === tab;
                                    return (
                                      <button 
                                        key={tab} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTabAttivo(tab); }}
                                        className="tab-btn"
                                        style={{ 
                                          flex: 1, textAlign: 'center', padding: '15px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                                          color: isActive ? '#16a34a' : '#64748b', borderBottom: isActive ? '3px solid #16a34a' : 'none', 
                                          backgroundColor: isActive ? '#f0fdf4' : 'transparent', outline: 'none'
                                        }}
                                      >
                                        {tab}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* CONTENUTO SCHEDE */}
                                <div style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
                                  
                                  {tabAttivo === '1 X 2' && (
                                    <div className="stats-grid">
                                      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', fontWeight: 'bold' }}>PROBABILITÀ 1X2</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>1:</span> <strong>{match.perc_1 || 0}%</strong></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', margin: '6px 0' }}><span>X:</span> <strong>{match.perc_x || 0}%</strong></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>2:</span> <strong>{match.perc_2 || 0}%</strong></div>
                                      </div>
                                      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', fontWeight: 'bold' }}>RISULTATI ESATTI</div>
                                        {Array.isArray(match.risultati_esatti) ? match.risultati_esatti.slice(0, 3).map((r, i) => (
                                          <div key={i} style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 'bold', marginBottom: '4px' }}>#{i+1} - {r}</div>
                                        )) : <div style={{ fontSize: '13px', color: '#94a3b8' }}>Dati in caricamento...</div>}
                                      </div>
                                    </div>
                                  )}

                                  {tabAttivo === 'GG/NG' && (
                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                      <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '14px' }}>ANALISI GOL - NOGOL</h3>
                                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>GOAL (GG)</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{match.perc_gg || 0}%</div></div>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>NO GOAL (NG)</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{100 - (match.perc_gg || 0)}%</div></div>
                                      </div>
                                    </div>
                                  )}

                                  {tabAttivo === 'U/O 2.5' && (
                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                      <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '14px' }}>ANALISI UNDER / OVER 2.5</h3>
                                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>OVER 2.5</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{match.perc_over || 0}%</div></div>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>UNDER 2.5</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{match.perc_under || 0}%</div></div>
                                      </div>
                                    </div>
                                  )}

                                  {tabAttivo === 'CORNER & EXTRA' && (
                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                      <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '14px' }}>STATISTICHE DISCIPLINARI</h3>
                                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>CORNER</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ca8a04' }}>{((parseFloat(match.corner_casa_media) || 0) + (parseFloat(match.corner_fuori_media) || 0)).toFixed(1)}</div></div>
                                        <div><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>CARTELLINI</div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>{((parseFloat(match.cartellini_casa_media) || 0) + (parseFloat(match.cartellini_fuori_media) || 0)).toFixed(1)}</div></div>
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
