import time
import requests
from datetime import datetime

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

# Configurazione della White List e degli anni
LEGHE_WHITELIST = [39, 135, 136, 140, 78, 61, 88, 94] # Escludiamo le coppe temporaneamente per non duplicare i calciatori delle rispettive leghe
STAGIONI_STORICHE = [2020, 2021, 2022, 2023, 2024]

def estrai_storico_giocatori_5anni():
    print(f"🧬 AVVIO SCARICO MASSIVO ANAGRAFICA E STATISTICHE CALCIATORI (5 ANNI)")
    print("---------------------------------------------------------------------")

    for stagione in STAGIONI_STORICHE:
        for lega in LEGHE_WHITELIST:
            print(f"\n🏃 Scansione Calciatori della Lega ID {lega} - Stagione {stagione}...")
            
            page = 1
            while True:
                url = f"https://v3.football.api-sports.io/players?league={lega}&season={stagione}&page={page}"
                try:
                    res = requests.get(url, headers=FOOTBALL_HEADERS, timeout=12)
                    if res.status_code != 200:
                        print(f"⚠️ Errore API alla pagina {page}. Pausa e riprovo...")
                        time.sleep(5)
                        continue
                        
                    data_json = res.json()
                    response_players = data_json.get("response", [])
                    paging = data_json.get("paging", {})
                    current_page = paging.get("current", 1)
                    total_pages = paging.get("total", 1)
                    
                    if not response_players:
                        print(f"🛑 Nessun giocatore trovato alla pagina {page}. Fine campionato.")
                        break
                        
                    print(f"📦 Elaborazione pagina {current_page} di {total_pages} (Trovati {len(response_players)} calciatori)...")
                    
                    blocco_giocatori = []
                    for item in response_players:
                        p_info = item.get("player", {})
                        stats = item.get("statistics", [{}])[0] # Prendiamo la prima scheda statistica principale del campionato
                        
                        team = stats.get("team", {})
                        games = stats.get("games", {})
                        goals_stats = stats.get("goals", {})
                        shots = stats.get("shots", {})
                        fouls = stats.get("fouls", {})
                        cards = stats.get("cards", {})
                        
                        blocco_giocatori.append({
                            "player_id": p_info.get("id"),
                            "player_name": p_info.get("name"),
                            "team_id": team.get("id"),
                            "team_name": team.get("name"),
                            "league_id": lega,
                            "stagione": stagione,
                            "partite_giocate": games.get("appeard", 0) or 0,
                            "partite_titolare": games.get("lineups", 0) or 0,
                            "minuti_giocati": games.get("minutes", 0) or 0,
                            "gol": goals_stats.get("total", 0) or 0,
                            "assist": goals_stats.get("assists", 0) or 0,
                            "tiri_totali": shots.get("total", 0) or 0,
                            "tiri_in_porta": shots.get("total", 0) or 0,
                            "falli_fatti": fouls.get("committed", 0) or 0,
                            "falli_subiti": fouls.get("drawn", 0) or 0,
                            "gialli": cards.get("yellow", 0) or 0,
                            "rossi": cards.get("red", 0) or 0
                        })
                    
                    # Caricamento massivo su Supabase della pagina corrente per non saturare la memoria
                    if blocco_giocatori:
                        requests.post(
                            f"{SUPABASE_URL}/rest/v1/storico_giocatori_5anni?on_conflict=player_id,team_id,stagione",
                            headers=SUPABASE_HEADERS,
                            json=blocco_giocatori
                        )
                    
                    # Se abbiamo raggiunto l'ultima pagina, usciamo dal ciclo di questo campionato
                    if current_page >= total_pages:
                        break
                        
                    page += 1
                    time.sleep(0.5) # Pausa di sicurezza antirallentamento
                    
                except Exception as e:
                    print(f"❌ Errore critico durante lo scarico: {e}")
                    time.sleep(5)
                    
    print("\n🏁 COMPLETATO: Tutti i dati prestazionali dei calciatori sono ora nel tuo database.")

if __name__ == "__main__":
    estrai_storico_giocatori_5anni()