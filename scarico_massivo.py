import time
import requests
from datetime import datetime

# =====================================================================
# COORDINATE DI SISTEMA (SOSTITUISCI LE CHIAVI SE NECESSARIO)
# =====================================================================
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD" 
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"

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

# La nostra Elite Definitiva (10 Leghe)
LEGHE_WHITELIST = [
    39,   # Premier League
    135,  # Serie A
    136,  # Serie B
    140,  # La Liga
    78,   # Bundesliga
    61,   # Ligue 1
    88,   # Eredivisie
    94,   # Primeira Liga
    2,    # Champions League
    3     # Europa League
]
STAGIONE = 2025

def scarico_massivo_totale():
    print(f"🔥 INIZIO SCARICO MASSIVO - ORE {datetime.now().strftime('%H:%M:%S')}")
    print("Obiettivo: Svuotare le API prima di mezzanotte e mappare 10 campionati interi.\n")

    for lega_id in LEGHE_WHITELIST:
        print(f"\n==================================================")
        print(f"🌍 ELABORAZIONE LEGA ID: {lega_id}")
        print(f"==================================================")
        
        # 1. SCARICO TUTTO IL CALENDARIO (Tutte le 380+ partite)
        print("📅 1. Estrazione intero calendario stagionale...")
        url_fixtures = f"https://v3.football.api-sports.io/fixtures?league={lega_id}&season={STAGIONE}"
        res_fix = requests.get(url_fixtures, headers=FOOTBALL_HEADERS)
        
        if res_fix.status_code == 200:
            fixtures = res_fix.json().get("response", [])
            match_da_inserire = []
            
            for item in fixtures:
                fix = item.get("fixture", {})
                leg = item.get("league", {})
                tms = item.get("teams", {})
                gls = item.get("goals", {})
                
                f_id = fix.get("id")
                data_match = fix.get("date")[0:10] if fix.get("date") else "1970-01-01"
                status_short = fix.get("status", {}).get("short", "NS")
                
                stato_visualizzato = "FINITA" if status_short in ["FT", "AET", "PEN"] else ("PROGRAMMATA" if status_short in ["NS", "TBD"] else "LIVE")

                match_da_inserire.append({
                    "id": f_id,
                    "data_match": data_match,
                    "campionato": f"{leg.get('country', 'Europe')} - {leg.get('name', '')}",
                    "home_team": tms.get("home", {}).get("name"), 
                    "away_team": tms.get("away", {}).get("name"),
                    "home_score": gls.get("home") if gls.get("home") is not None else 0, 
                    "away_score": gls.get("away") if gls.get("away") is not None else 0,
                    "status": stato_visualizzato, 
                    "minute": "FT" if stato_visualizzato == "FINITA" else fix.get("date")[11:16]
                })
            
            if match_da_inserire:
                step = 100
                for i in range(0, len(match_da_inserire), step):
                    blocco = match_da_inserire[i:i+step]
                    requests.post(f"{SUPABASE_URL}/rest/v1/partita_live?on_conflict=id", headers=SUPABASE_HEADERS, json=blocco)
                print(f"✅ Inseriti/Aggiornati {len(match_da_inserire)} match in Supabase.")

        # 2. SCARICO STATISTICHE SQUADRE (Il vero consumo API)
        print("📊 2. Estrazione statistiche profonde delle squadre...")
        url_teams = f"https://v3.football.api-sports.io/teams?league={lega_id}&season={STAGIONE}"
        res_teams = requests.get(url_teams, headers=FOOTBALL_HEADERS)
        
        if res_teams.status_code == 200:
            teams = res_teams.json().get("response", [])
            for t in teams:
                team_id = t.get("team", {}).get("id")
                team_name = t.get("team", {}).get("name")
                
                url_stats = f"https://v3.football.api-sports.io/teams/statistics?league={lega_id}&season={STAGIONE}&team={team_id}"
                res_stats = requests.get(url_stats, headers=FOOTBALL_HEADERS)
                
                if res_stats.status_code == 200:
                    d = res_stats.json().get("response", {})
                    if not d: continue
                    
                    p_tot = d.get("fixtures", {}).get("played", {}).get("all", 1) or 1
                    corner = d.get("corners", {}).get("all", {}).get("total", 0) or 0
                    goals = d.get("goals", {}).get("for", {}).get("total", {}).get("all", 0) or 0
                    
                    yellow = sum(info.get("total", 0) or 0 for f, info in (d.get("cards", {}).get("yellow", {}) or {}).items())
                    red = sum(info.get("total", 0) or 0 for f, info in (d.get("cards", {}).get("red", {}) or {}).items())

                    payload_team = {
                        "team_id": team_id,
                        "team_name": team_name,
                        "campionato": d.get("league", {}).get("name", "Unknown"),
                        "league_id": lega_id,
                        "corner_media": round(corner / p_tot, 2),
                        "cartellini_media": round(yellow / p_tot, 2),
                        "rossi_media": round(red / p_tot, 2),
                        "gol_fatti_media": round(goals / p_tot, 2),
                        "streak": d.get("form", "N/D")[-5:] if d.get("form") else "N/D"
                    }
                    
                    requests.post(f"{SUPABASE_URL}/rest/v1/statistiche_squadre?on_conflict=team_id", headers=SUPABASE_HEADERS, json=payload_team)
                    print(f"   [+] Elaborata: {team_name}")
                    
                time.sleep(0.3) # Pausa di 300ms tra una squadra e l'altra per evitare blocchi dell'API

    print("\n🏁 MISSIONE COMPIUTA: Dati salvati con successo su Supabase.")

if __name__ == "__main__":
    scarico_massivo_totale()