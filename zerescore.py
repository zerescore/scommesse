import os
import time
import requests
from datetime import datetime, timedelta

SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD" 
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"

REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1/partita_live"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

FOOTBALL_HEADERS = {
    "x-rapidapi-key": API_KEY_FOOTBALL,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

# =====================================================================
# WHITE LIST DEI CAMPIONATI (Aggiungi o rimuovi ID se vuoi)
# 39: Premier, 135: Serie A, 136: Serie B, 140: La Liga, 78: Bundesliga
# 61: Ligue 1, 88: Olanda, 94: Portogallo, 2: Champions, 3: Europa League
# =====================================================================
LEGHE_WHITELIST = [39, 135, 136, 140, 78, 61, 88, 94, 2, 3]

def recupera_statistiche_live_reali(fixture_id, home_id, away_id):
    live_stats = {
        "tiri_porta_h": 0, "tiri_porta_a": 0, "tiri_tot_h": 0, "tiri_tot_a": 0,
        "corner_h": 0, "corner_a": 0, "possesso_h": 50, "possesso_a": 50,
        "gialli_h": 0, "gialli_a": 0, "rossi_h": 0, "rossi_a": 0
    }
    try:
        url = f"https://v3.football.api-sports.io/fixtures/statistics?fixture={fixture_id}"
        res = requests.get(url, headers=FOOTBALL_HEADERS, timeout=5)
        if res.status_code == 200:
            response_data = res.json().get("response", [])
            for team_entry in response_data:
                current_team_id = team_entry.get("team", {}).get("id")
                stats_list = team_entry.get("statistics", [])
                s_map = {s.get("type"): s.get("value") for s in stats_list}
                
                if current_team_id == home_id:
                    live_stats["tiri_porta_h"] = s_map.get("Shots on Goal", 0) or 0
                    live_stats["tiri_tot_h"] = s_map.get("Total Shots", 0) or 0
                    live_stats["corner_h"] = s_map.get("Corner Kicks", 0) or 0
                    pos_str = str(s_map.get("Ball Possession", "50%")).replace("%","")
                    live_stats["possesso_h"] = int(pos_str) if pos_str.isdigit() else 50
                    live_stats["gialli_h"] = s_map.get("Yellow Cards", 0) or 0
                    live_stats["rossi_h"] = s_map.get("Red Cards", 0) or 0
                elif current_team_id == away_id:
                    live_stats["tiri_porta_a"] = s_map.get("Shots on Goal", 0) or 0
                    live_stats["tiri_tot_a"] = s_map.get("Total Shots", 0) or 0
                    live_stats["corner_a"] = s_map.get("Corner Kicks", 0) or 0
                    pos_str = str(s_map.get("Ball Possession", "50%")).replace("%","")
                    live_stats["possesso_a"] = int(pos_str) if pos_str.isdigit() else 50
                    live_stats["gialli_a"] = s_map.get("Yellow Cards", 0) or 0
                    live_stats["rossi_a"] = s_map.get("Red Cards", 0) or 0
    except Exception as e:
        pass
    return live_stats

def sincronizzazione_totale_palinsesto():
    print(f"\n🔄 [{datetime.now().strftime('%H:%M:%S')}] Estrazione Palinsesto Premium...")
    
    match_aggiornati = []
    
    # Calcoliamo le 3 date: Oggi, Domani, Dopodomani
    date_da_scansionare = [
        datetime.now().strftime("%Y-%m-%d"),
        (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    ]

    for data_target in date_da_scansionare:
        try:
            print(f"📅 Scansione data: {data_target}...")
            url = f"https://v3.football.api-sports.io/fixtures?date={data_target}"
            res = requests.get(url, headers=FOOTBALL_HEADERS, timeout=10)
            
            if res.status_code == 200:
                fixtures = res.json().get("response", [])
                
                # FILTRO WHITE LIST: Togliamo il limite dei 20 e teniamo SOLO i campionati scelti
                match_premium = [f for f in fixtures if f.get("league", {}).get("id") in LEGHE_WHITELIST]
                
                for item in match_premium:
                    fix = item.get("fixture", {})
                    leg = item.get("league", {})
                    tms = item.get("teams", {})
                    gls = item.get("goals", {})
                    
                    f_id = fix.get("id")
                    home_id = tms.get("home", {}).get("id")
                    away_id = tms.get("away", {}).get("id")
                    
                    status_short = fix.get("status", {}).get("short", "NS")
                    stato_visualizzato = "LIVE" if status_short in ["1H", "2H", "HT"] else ("FINITA" if status_short in ["FT", "AET", "PEN"] else "PROGRAMMATA")
                    
                    # Estrae i dati reali (o simulati se non disponibili) solo per i match LIVE o FINITI per risparmiare chiamate
                    s = {"tiri_porta_h": 0, "tiri_porta_a": 0, "tiri_tot_h": 0, "tiri_tot_a": 0, "corner_h": 0, "corner_a": 0, "possesso_h": 50, "possesso_a": 50, "gialli_h": 0, "gialli_a": 0, "rossi_h": 0, "rossi_a": 0}
                    if stato_visualizzato in ["LIVE", "FINITA"]:
                        s = recupera_statistiche_live_reali(f_id, home_id, away_id)

                    match_aggiornati.append({
                        "id": f_id,
                        "data_match": data_target,
                        "campionato": f"{leg.get('country', 'Europe')} - {leg.get('name', '')}",
                        "home_team": tms.get("home", {}).get("name"), 
                        "away_team": tms.get("away", {}).get("name"),
                        "home_score": gls.get("home") if gls.get("home") is not None else 0, 
                        "away_score": gls.get("away") if gls.get("away") is not None else 0,
                        "status": stato_visualizzato, 
                        "minute": "FT" if status_short == "FT" else (f"{fix.get('status', {}).get('elapsed', 0)}'" if stato_visualizzato == "LIVE" else fix.get("date")[11:16]),
                        
                        "live_tiri_in_porta_casa": s["tiri_porta_h"], "live_tiri_in_porta_fuori": s["tiri_porta_a"],
                        "live_tiri_totali_casa": s["tiri_tot_h"], "live_tiri_totali_fuori": s["tiri_tot_a"],
                        "live_corner_casa": s["corner_h"], "live_corner_fuori": s["corner_a"],
                        "possesso_casa": s["possesso_h"], "possesso_fuori": s["possesso_a"],
                        "live_gialli_casa": s["gialli_h"], "live_gialli_fuori": s["gialli_a"],
                        "live_rossi_casa": s["rossi_h"], "live_rossi_fuori": s["rossi_a"],
                        
                        "quota_1": 1.95, "quota_x": 3.40, "quota_2": 3.80,
                        "perc_1": 45, "perc_x": 30, "perc_2": 25,
                        "perc_over": 55, "perc_under": 45, "perc_gg": 60,
                        "corner_casa_media": 5.5, "corner_fuori_media": 4.2
                    })
        except Exception as e:
            print(f"❌ Errore data {data_target}: {e}")

    if match_aggiornati:
        try:
            # Svuota tutto il database e lo riempie solo con le partite pulite della White List
            requests.delete(REST_URL, headers=SUPABASE_HEADERS)
            requests.post(REST_URL, headers=SUPABASE_HEADERS, json=match_aggiornati)
            print(f"🔥 Database allineato! Inseriti {len(match_aggiornati)} match premium della White List per oggi, domani e dopodomani.")
        except Exception as e:
            print(f"❌ Errore caricamento Supabase: {e}")

if __name__ == "__main__":
    print("🚀 BOT AVVIATO: Filtraggio leghe premium in corso...")
    while True:
        sincronizzazione_totale_palinsesto()
        # Visto che scarichiamo 3 giorni interi, rallentiamo il loop a 5 minuti per non polverizzare le API
        time.sleep(300)