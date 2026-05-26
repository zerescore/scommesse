import requests
import time

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# Mappatura dei campionati e delle stagioni richieste
campionati = [135, 39, 140, 78, 61, 1]
stagioni = [2022, 2023, 2024, 2025]

headers_football = {'x-apisports-key': API_KEY_FOOTBALL}
url_supabase = f"{SUPABASE_URL}/rest/v1/partite_avanzate?on_conflict=id"
headers_supabase = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def estrai_statistica(stats_list, tipo_stat):
    """Funzione di supporto per estrarre il valore numerico della statistica"""
    for s in stats_list:
        if s['type'] == tipo_stat:
            valore = s['value']
            if valore is None: return 0
            if isinstance(valore, str) and "%" in valore:
                return int(valore.replace("%", ""))
            return int(valore)
    return 0

print("🚀 AVVIO DEL COSTRUTTORE STATISTICO AVANZATO...")

for camp in campionati:
    for stag in stagioni:
        print(f"\n📡 Scaricamento Campionato ID {camp} - Stagione {stag}...")
        
        # 1. Prendiamo il calendario delle partite
        url_fix = f"https://v3.football.api-sports.io/fixtures?league={camp}&season={stag}"
        res_fix = requests.get(url_fix, headers=headers_football)
        
        if res_fix.status_code != 200:
            print(f"❌ Errore nel recupero calendario per campionato {camp}")
            continue
            
        partite = res_fix.json().get('response', [])
        print(f"⚽ Trovate {len(partite)} partite. Inizio estrazione statistiche di dettaglio...")
        
        for p in partite:
            fixture = p['fixture']
            status = fixture['status']['short']
            
            # Prepariamo i dati base della partita
            dati_partita = {
                "id": fixture['id'],
                "id_campionato": p['league']['id'],
                "stagione": p['league']['season'],
                "giornata": p['league']['round'],
                "data_ora": fixture['date'],
                "stato": status,
                "id_casa": p['teams']['home']['id'],
                "nome_casa": p['teams']['home']['name'],
                "logo_casa": p['teams']['home']['logo'],
                "gol_casa": p['goals']['home'],
                "id_trasferta": p['teams']['away']['id'],
                "nome_trasferta": p['teams']['away']['name'],
                "logo_trasferta": p['teams']['away']['logo'],
                "gol_trasferta": p['goals']['away'],
                # Inizializziamo i valori avanzati a 0 o None
                "tiri_totali_casa": 0, "tiri_in_porta_casa": 0, "possesso_palla_casa": 0,
                "calci_d_angolo_casa": 0, "falli_casa": 0, "ammonizioni_casa": 0, "espulsioni_casa": 0,
                "tiri_totali_trasf": 0, "tiri_in_porta_trasf": 0, "possesso_palla_trasf": 0,
                "calci_d_angolo_trasf": 0, "falli_trasf": 0, "ammonizioni_trasf": 0, "espulsioni_trasf": 0
            }
            
            # Se la partita è terminata ('FT'), andiamo a prendere le statistiche avanzate dei team
            if status == 'FT':
                url_stats = f"https://v3.football.api-sports.io/fixtures/statistics?fixture={fixture['id']}"
                res_stats = requests.get(url_stats, headers=headers_football)
                
                if res_stats.status_code == 200:
                    stats_data = res_stats.json().get('response', [])
                    if len(stats_data) >= 2:
                        # stats_data[0] è la squadra in casa, stats_data[1] è quella in trasferta
                        casa_stats = stats_data[0]['statistics']
                        trasf_stats = stats_data[1]['statistics']
                        
                        # Inseriamo i dati reali estratti
                        dati_partita["tiri_totali_casa"] = estrai_statistica(casa_stats, "Total Shots")
                        dati_partita["tiri_in_porta_casa"] = estrai_statistica(casa_stats, "Shots on Goal")
                        dati_partita["possesso_palla_casa"] = estrai_statistica(casa_stats, "Ball Possession")
                        dati_partita["calci_d_angolo_casa"] = estrai_statistica(casa_stats, "Corner Kicks")
                        dati_partita["falli_casa"] = estrai_statistica(casa_stats, "Fouls")
                        dati_partita["ammonizioni_casa"] = estrai_statistica(casa_stats, "Yellow Cards")
                        dati_partita["espulsioni_casa"] = estrai_statistica(casa_stats, "Red Cards")
                        
                        dati_partita["tiri_totali_trasf"] = estrai_statistica(trasf_stats, "Total Shots")
                        dati_partita["tiri_in_porta_trasf"] = estrai_statistica(trasf_stats, "Shots on Goal")
                        dati_partita["possesso_palla_trasf"] = estrai_statistica(trasf_stats, "Ball Possession")
                        dati_partita["calci_d_angolo_trasf"] = estrai_statistica(trasf_stats, "Corner Kicks")
                        dati_partita["falli_trasf"] = estrai_statistica(trasf_stats, "Fouls")
                        dati_partita["ammonizioni_trasf"] = estrai_statistica(trasf_stats, "Yellow Cards")
                        dati_partita["espulsioni_trasf"] = estrai_statistica(trasf_stats, "Red Cards")
                
                # Una piccolissima pausa per rispettare i limiti di velocità delle richieste (rate limit)
                time.sleep(0.1)

            # Inviamo tutto a Supabase
            requests.post(url_supabase, json=dati_partita, headers=headers_supabase)
            
        print(f"💾 Stagione {stag} del Campionato {camp} salvata completamente con statistiche avanzate.")

print("\n🎯 DATABASE COMPLETO! Hai il top dei dati mondiali pronto per la tua interfaccia moderna!")