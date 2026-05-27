import time
import requests

SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD" 
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

FOOTBALL_HEADERS = {
    "x-rapidapi-key": API_KEY_FOOTBALL,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

LEGHE_WHITELIST = [39, 135, 136, 140, 78, 61, 88, 94, 2, 3]
# HO AGGIUNTO IL 2025 ALLA MACCHINA DEL TEMPO
STAGIONI_STORICHE = [2020, 2021, 2022, 2023, 2024, 2025] 

def estrai_storico():
    print("🕰️ AVVIO MACCHINA DEL TEMPO: Estrazione Storico 6 Anni...")
    
    for stagione in STAGIONI_STORICHE:
        print(f"\n=========================================")
        print(f"🏆 ELABORAZIONE STAGIONE: {stagione}")
        print(f"=========================================")
        
        for lega in LEGHE_WHITELIST:
            print(f"↳ Estrazione team per la lega {lega}...")
            url_teams = f"https://v3.football.api-sports.io/teams?league={lega}&season={stagione}"
            
            try:
                res_teams = requests.get(url_teams, headers=FOOTBALL_HEADERS, timeout=10)
                dati_teams = res_teams.json()
                
                # SE L'API CI BLOCCA, ORA CE NE ACCORGIAMO E STAMPIAMO L'ERRORE
                if dati_teams.get("errors"):
                    print(f"   [🛑 BLOCCO API] Il server ha risposto: {dati_teams['errors']}")
                    print("   [⏳] Pausa di sicurezza di 5 secondi per far calmare i server...")
                    time.sleep(5)
                    continue
                    
                teams = dati_teams.get("response", [])
                
                if not teams:
                    print("   [⚠️] Nessuna squadra trovata per questa lega e stagione.")
                    continue
                    
            except Exception as e:
                print(f"   [⏳ ERRORE DI CONNESSIONE] {e}")
                continue
            
            for t in teams:
                team_id = t.get("team", {}).get("id")
                team_name = t.get("team", {}).get("name")
                
                url_stats = f"https://v3.football.api-sports.io/teams/statistics?league={lega}&season={stagione}&team={team_id}"
                
                try:
                    res_stats = requests.get(url_stats, headers=FOOTBALL_HEADERS, timeout=10)
                    
                    dati_stats = res_stats.json()
                    # CONTROLLO ANTI-BAN ANCHE SULLE STATISTICHE
                    if dati_stats.get("errors"):
                        print(f"   [🛑 BLOCCO API STATS] {dati_stats['errors']}")
                        time.sleep(3)
                        continue
                        
                    d = dati_stats.get("response", {})
                except Exception:
                    print(f"   [⏳ TIMEOUT] Saltato temporaneamente {team_name} per timeout di rete")
                    continue

                if not d: 
                    continue
                
                fix = d.get("fixtures", {})
                p_tot = fix.get("played", {}).get("all", 0)
                if p_tot == 0: continue
                
                vittorie = fix.get("wins", {}).get("all", 0)
                pareggi = fix.get("draws", {}).get("all", 0)
                sconfitte = fix.get("loses", {}).get("all", 0)
                
                goals_for = d.get("goals", {}).get("for", {}).get("total", {}).get("all", 0)
                goals_against = d.get("goals", {}).get("against", {}).get("total", {}).get("all", 0)
                
                corner = d.get("corners", {}).get("all", {}).get("total", 0)
                yellow = sum(info.get("total", 0) or 0 for f, info in (d.get("cards", {}).get("yellow", {}) or {}).items())
                red = sum(info.get("total", 0) or 0 for f, info in (d.get("cards", {}).get("red", {}) or {}).items())
                
                clean_sheets = d.get("clean_sheet", {}).get("total", 0)
                
                payload = {
                    "team_id": team_id,
                    "team_name": team_name,
                    "league_id": lega,
                    "stagione": stagione,
                    "partite_giocate": p_tot,
                    "vittorie": vittorie,
                    "pareggi": pareggi,
                    "sconfitte": sconfitte,
                    "gol_fatti": goals_for,
                    "gol_subiti": goals_against,
                    "corner_totali": corner,
                    "gialli_totali": yellow,
                    "rossi_totali": red,
                    "clean_sheets": clean_sheets,
                    "over_25_perc": 0.0 
                }
                
                requests.post(f"{SUPABASE_URL}/rest/v1/storico_squadre_5anni?on_conflict=team_id,league_id,stagione", headers=SUPABASE_HEADERS, json=payload)
                print(f"   [+] {team_name} ({stagione}) salvata su database.")
                
                # PAUSA ANTI-BAN TRA UNA SQUADRA E L'ALTRA (FONDAMENTALE)
                time.sleep(1) 
                
            # PAUSA DI RESPIRO TRA UNA LEGA E L'ALTRA
            time.sleep(2)

if __name__ == "__main__":
    estrai_storico()