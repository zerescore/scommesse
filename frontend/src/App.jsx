import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Star, ChevronDown, ChevronUp, Calendar, Trophy, ChevronRight } from 'lucide-react';

// Connessione Supabase
const supabase = createClient(
  "https://qfshfjphjshrpwdnsekn.supabase.co", 
  "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"
);

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

export default function WorkstationDefinitiva() {
  const [partite, setPartite] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [mieiMatchIds, setMieiMatchIds] = useState([]);
  const [dataSelezionata, setDataSelezionata] = useState('OGGI'); 
  const [legaSelezionata, setLegaSelezionata] = useState(null); 
  const [nazioneEspansa, setNazioneEspansa] = useState(null); 
  const [matchEspanso, setMatchEspanso] = useState(null); 

  // Stati dei Filtri Superiori
  const [categoriaMercato, setCategoriaMercato] = useState('1X2');
  const [sottoCategoria, setSottoCategoria] = useState('TUTTE');

  // STATO PER LE SCHEDE INTERNE DEL MATCH (Il motore dei tab)
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
        setPartite(data || []);
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
    <div style={{ display: 'flex', backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* PANNELLO LATERALE */}
      <div style={{ width: '320px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#fff', margin: 0 }}>ZERESCORE <span style={{ color: '#38bdf8' }}>PRO</span></h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <Star size={14} style={{ marginRight: '6px', color: '#facc15' }} /> I MIEI MATCH ({mieiMatchList.length})
            </h3>
            {mieiMatchList.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px' }}>Nessun evento selezionato.</div>
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
                  onClick={() => { setDataSelezionata(filtro.id); setLegaSelezionata(null); setMatchEspanso(null); setNazioneEspansa(null); }}
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
              <Trophy size={14} style={{ marginRight: '6px' }} /> TUTTI I CAMPIONATI
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
                            onClick={() => { setLegaSelezionata(lega); setMatchEspanso(null); setCategoriaMercato('1X2'); setSottoCategoria('TUTTE'); }}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#020617', height: '100vh', overflow: 'hidden' }}>
        
        {/* BARRA SUPERIORE */}
        <div style={{ backgroundColor: '#0b1120', borderBottom: '2px solid #1e293b', padding: '20px 30px', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#fff', textTransform: 'uppercase' }}>
                  {legaSelezionata ? `Analisi: ${legaSelezionata}` : `Eventi: ${dataSelezionata}`}
                </h2>
                <p style={{ color: '#4ade80', margin: '5px 0 0 0', fontSize: '13px', fontWeight: 'bold' }}>{partiteFiltrate.length} match trovati</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#0f172a', padding: '6px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginLeft: '10px' }}>SEZIONE:</span>
                <button style={{ padding: '8px 24px', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: '#38bdf8', color: '#0f172a' }}>
                  1X2 & ESITI FINALI
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {[ { id: 'TUTTE', label: 'TUTTI I MATCH', icon: '🌍' }, { id: 'STAT_1', label: 'STATISTICHE 1', icon: '🏠' }, { id: 'STAT_X', label: 'STATISTICHE X', icon: '⚖️' }, { id: 'STAT_2', label: 'STATISTICHE 2', icon: '✈️' }, { id: 'DOPPIA_CHANCE', label: 'DOPPIA CHANCE', icon: '🛡️' }, { id: 'PRIMO_TEMPO', label: 'ESITO 1° TEMPO', icon: '⏱️' } ].map(sub => (
                <button 
                  key={sub.id} onClick={() => setSottoCategoria(sub.id)}
                  style={{ flex: 1, padding: '12px 10px', fontSize: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: sottoCategoria === sub.id ? '#10b981' : '#1e293b', color: sottoCategoria === sub.id ? '#0f172a' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '14px' }}>{sub.icon}</span> {sub.label}
                </button>
              ))}
            </div>
        </div>

        {/* LISTA MATCH E PLANCIA VERDE */}
        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {partiteFiltrate.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#475569', border: '1px dashed #334155', borderRadius: '8px' }}>Nessun match disponibile nel database per questa selezione.</div>
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
                      
                      return (
                        <div key={match.id} style={{ backgroundColor: '#0f172a', border: `1px solid ${isEspanso ? '#16a34a' : '#1e293b'}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                          
                          {/* HEADER RIGA */}
                          <div 
                            onClick={() => {
                              setMatchEspanso(isEspanso ? null : match.id);
                              setTabAttivo('1 X 2'); // Reset alla prima scheda quando apri un nuovo match
                            }}
                            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: isEspanso ? '#0b1120' : 'transparent' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <button onClick={(e) => toggleMioMatch(e, match.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                                <Star size={20} fill={isPreferito ? '#facc15' : 'transparent'} color={isPreferito ? '#facc15' : '#64748b'} />
                              </button>
                              <div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{match.data_match} • {match.campionato}</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: isFinita ? '#94a3b8' : '#fff', marginTop: '4px' }}>
                                  {match.home_team} <span style={{ color: isFinita ? '#64748b' : '#38bdf8', padding: '0 8px' }}>{match.home_score} - {match.away_score}</span> {match.away_team}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>STATO</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: match.status === 'LIVE' ? '#ef4444' : (isFinita ? '#64748b' : '#10b981') }}>
                                  {match.status} {match.minute && match.minute !== 'Da Iniz.' ? `(${match.minute})` : ''}
                                </div>
                              </div>
                              {isEspanso ? <ChevronUp color="#64748b" /> : <ChevronDown color="#64748b" />}
                            </div>
                          </div>

                          {/* PLANCIA VERDE */}
                          {isEspanso && (
                            <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderTop: '1px solid #1e293b' }}>
                              
                              <div style={{ backgroundColor: '#0f5132', padding: '25px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                  <div style={{ width: '50px', height: '50px', backgroundColor: '#14532d', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #22c55e', fontSize: '20px' }}>🏠</div>
                                  <div style={{ fontSize: '16px', fontWeight: '900' }}>{match.home_team}</div>
                                </div>

                                <div style={{ textAlign: 'center', flex: 2, padding: '0 20px' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>{match.data_match}</div>
                                  <div style={{ fontSize: '12px', color: '#86efac', textTransform: 'uppercase', letterSpacing: '1px' }}>{match.campionato}</div>
                                  <div style={{ fontSize: '12px', color: '#d1fae5', marginTop: '4px' }}>Giornata {match.giornata || 'N/D'} <span style={{ color: '#6ee7b7' }}>su {match.giornate_totali || '38'}</span></div>
                                  <div style={{ margin: '10px 0', padding: '8px 0', borderTop: '1px solid #166534', borderBottom: '1px solid #166534', fontSize: '16px', fontWeight: '900' }}>
                                    {isFinita ? `Terminata ${match.home_score} - ${match.away_score}` : 'Non Iniziata'}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                                    <div>{match.partite_salvate || '0'} PARTITE SALVATE</div>
                                    <div>{match.scontri_diretti || '0'} SCONTRI (H2H)</div>
                                  </div>
                                </div>

                                <div style={{ textAlign: 'center', flex: 1 }}>
                                  <div style={{ width: '50px', height: '50px', backgroundColor: '#14532d', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #38bdf8', fontSize: '20px' }}>✈️</div>
                                  <div style={{ fontSize: '16px', fontWeight: '900' }}>{match.away_team}</div>
                                </div>
                              </div>

                              {/* BARRA TAB INTERATTIVA (PULSANTI REALI) */}
                              <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#fff' }}>
                                {['1 X 2', 'GG/NG', 'U/O 2.5', 'CORNER & EXTRA'].map((tab) => {
                                  const isActive = tabAttivo === tab;
                                  return (
                                    <button 
                                      key={tab} 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTabAttivo(tab);
                                      }}
                                      style={{ 
                                        flex: 1, textAlign: 'center', padding: '15px 0', fontSize: '13px', fontWeight: 'bold', 
                                        cursor: 'pointer', border: 'none',
                                        color: isActive ? '#16a34a' : '#64748b', 
                                        borderBottom: isActive ? '3px solid #16a34a' : 'none', 
                                        backgroundColor: isActive ? '#f0fdf4' : 'transparent', 
                                        transition: '0.2s', outline: 'none'
                                      }}
                                    >
                                      {tab}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* CONTENUTO SCHEDE */}
                              <div style={{ padding: '25px', backgroundColor: '#f8fafc' }}>
                                
                                {tabAttivo === '1 X 2' && (
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                      <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '11px', color: '#94a3b8' }}>ESITO 1X2</div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>Possibile 1</div></div>
                                      <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '11px', color: '#94a3b8' }}>MERCATO U/O</div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>Under 2.5</div></div>
                                      <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: '11px', color: '#94a3b8' }}>BOT APPROVAL</div><div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>Approva ✓</div></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
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
                                  </div>
                                )}

                                {tabAttivo === 'GG/NG' && (
                                  <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>ANALISI GOL - NOGOL</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>PROBABILITÀ GOAL (GG)</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>{match.perc_gg || 0}%</div></div>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>PROBABILITÀ NO GOAL (NG)</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{100 - (match.perc_gg || 0)}%</div></div>
                                    </div>
                                  </div>
                                )}

                                {tabAttivo === 'U/O 2.5' && (
                                  <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>ANALISI UNDER / OVER 2.5</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>OVER 2.5</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{match.perc_over || 0}%</div></div>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>UNDER 2.5</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{match.perc_under || 0}%</div></div>
                                    </div>
                                  </div>
                                )}

                                {tabAttivo === 'CORNER & EXTRA' && (
                                  <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>STATISTICHE DISCIPLINARI E ANGOLI</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>CORNER TOTALI ATTESI</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ca8a04' }}>{((parseFloat(match.corner_casa_media) || 0) + (parseFloat(match.corner_fuori_media) || 0)).toFixed(1)}</div></div>
                                      <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>CARTELLINI ATTESI</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>{((parseFloat(match.cartellini_casa_media) || 0) + (parseFloat(match.cartellini_fuori_media) || 0)).toFixed(1)}</div></div>
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
  );
}