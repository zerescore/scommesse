import requests

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# Chiediamo le quote della Serie A (135) per la stagione attuale (2025)
url_football = "https://v3.football.api-sports.io/odds?league=135&season=2025&bookmaker=1"
headers_football = {'x-apisports-key': API_KEY_FOOTBALL}

print("📡 Connessione ad API-Football per il download delle quote in tempo reale...")
response_football = requests.get(url_football, headers=headers_football)

if response_football.status_code == 200:
    dati = response_football.json().get('response', [])
    print(f"✅ Trovate le quote per {len(dati)} partite. Inizio inserimento su Supabase...")
    
    url_supabase = f"{SUPABASE_URL}/rest/v1/quote_partite?on_conflict=id_partita"
    headers_supabase = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    contatore = 0
    for item in dati:
        id_partita = item['fixture']['id']
        bookmaker = item['bookmakers'][0] # Bet365
        bookmaker_name = bookmaker['name']
        
        q_1, q_X, q_2 = None, None, None
        q_under, q_over = None, None
        q_goal, q_nogoal = None, None
        
        for market in bookmaker['bets']:
            if market['name'] == "Match Winner":
                for out in market['values']:
                    if out['value'] == "Home": q_1 = float(out['odd'])
                    if out['value'] == "Draw": q_X = float(out['odd'])
                    if out['value'] == "Away": q_2 = float(out['odd'])
            
            if market['name'] == "Goals Over/Under":
                for out in market['values']:
                    if out['value'] == "Over 2.5": q_over = float(out['odd'])
                    if out['value'] == "Under 2.5": q_under = float(out['odd'])
            
            if market['name'] == "Both Teams Score":
                for out in market['values']:
                    if out['value'] == "Yes": q_goal = float(out['odd'])
                    if out['value'] == "No": q_nogoal = float(out['odd'])
                    
        dati_quota = {
            "id_partita": id_partita,
            "bookmaker_nome": bookmaker_name,
            "quota_1": q_1, 
            "quota_x": q_X, # <--- NOTA LA 'x' MINUSCOLA QUI A SINISTRA
            "quota_2": q_2,
            "quota_under_25": q_under, 
            "quota_over_25": q_over,
            "quota_goal": q_goal, 
            "quota_nogoal": q_nogoal
        }
        
        res = requests.post(url_supabase, json=dati_quota, headers=headers_supabase)
        
        if res.status_code in [200, 201]:
            contatore += 1
        else:
            print(f"❌ Errore critico sulla partita {id_partita}. Stato server: {res.status_code}")
            print(f"Dettaglio errore: {res.text}") # Questo ci dice l'esatto motivo se fallisce di nuovo!

    print(f"\n💰 TABELLA QUOTE AGGIORNATA! Salvati {contatore} palinsesti su Supabase.")
else:
    print(f"❌ Errore API-Football: {response_football.status_code}")