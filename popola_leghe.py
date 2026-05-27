import requests

SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"

HEADERS_SB = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
HEADERS_FT = {"x-rapidapi-key": API_KEY_FOOTBALL, "x-rapidapi-host": "v3.football.api-sports.io"}

# Lista delle leghe che vuoi mappare nell'archivio (ID API-Football)
# 135 = Serie A, 39 = Premier League, 140 = La Liga, 78 = Bundesliga
LEGHE_TARGET = [135, 39, 140, 78] 
STAGIONE = 2025 # Usiamo l'ultima stagione completata o quella in corso per i dati massivi

def mappa_interi_campionati():
    print("🚀 Avvio popolamento database storico campionati...")
    
    for league_id in LEGHE_TARGET:
        # Recuperiamo la lista dei team della lega
        url_teams = f"https://v3.football.api-sports.io/teams?league={league_id}&season={STAGIONE}"
        res = requests.get(url_teams, headers=HEADERS_FT)
        
        if res.status_code == 200:
            teams = res.json().get("response", [])
            print(f"📦 Trovate {len(teams)} squadre per la lega ID {league_id}")
            
            for t in teams:
                team_id = t.get("team", {}).get("id")
                team_name = t.get("team", {}).get("name")
                
                # Scarichiamo le statistiche storiche della squadra
                url_stats = f"https://v3.football.api-sports.io/teams/statistics?league={league_id}&season={STAGIONE}&team={team_id}"
                res_stats = requests.get(url_stats, headers=HEADERS_FT)
                
                if res_stats.status_code == 200:
                    d = res_stats.json().get("response", {})
                    if not d: continue
                    
                    p_tot = d.get("fixtures", {}).get("played", {}).get("all", 1) or 1
                    corner = d.get("corners", {}).get("all", {}).get("total", 0) or 0
                    goals = d.get("goals", {}).get("for", {}).get("total", {}).get("all", 0) or 0
                    
                    yellow = 0
                    for f, info in (d.get("cards", {}).get("yellow", {}) or {}).items():
                        yellow += info.get("total", 0) or 0
                        
                    red = 0
                    for f, info in (d.get("cards", {}).get("red", {}) or {}).items():
                        red += info.get("total", 0) or 0

                    payload = {
                        "team_id": team_id,
                        "team_name": team_name,
                        "campionato": d.get("league", {}).get("name", "Unknown"),
                        "league_id": league_id,
                        "corner_media": round(corner / p_tot, 2),
                        "cartellini_media": round(yellow / p_tot, 2),
                        "rossi_media": round(red / p_tot, 2),
                        "gol_fatti_media": round(goals / p_tot, 2),
                        "streak": d.get("form", "N/D")[-5:] if d.get("form") else "N/D"
                    }
                    
                    # Upsert su Supabase basato sul team_id unico
                    requests.post(f"{SUPABASE_URL}/rest/v1/statistiche_squadre", headers=HEADERS_SB, json=payload)
                    print(f"✅ Salvata: {team_name} ({payload['campionato']})")
                    
if __name__ == "__main__":
    mappa_interi_campionati()