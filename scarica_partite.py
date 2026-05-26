import requests

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# Scarichiamo l'intero calendario della Serie A (ID: 135) per la stagione attuale
url_football = "https://v3.football.api-sports.io/fixtures?league=135&season=2025"
headers_football = {'x-apisports-key': API_KEY_FOOTBALL}

print("Inizio download di TUTTO il calendario di Serie A...")
response_football = requests.get(url_football, headers=headers_football)

if response_football.status_code == 200:
    dati = response_football.json()
    partite_lista = dati['response']
    print(f"Download completato! Trovate {len(partite_lista)} partite. Caricamento su Supabase...")
    
    url_supabase = f"{SUPABASE_URL}/rest/v1/partite?on_conflict=id"
    headers_supabase = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    for item in partite_lista:
        fixture = item['fixture']
        league = item['league']
        teams = item['teams']
        goals = item['goals']
        
        dati_partita = {
            "id": fixture['id'],
            "id_campionato": league['id'],
            "stagione": league['season'],
            "giornata": league['round'],
            "data_ora": fixture['date'],
            "stato": fixture['status']['short'],
            "id_casa": teams['home']['id'],
            "nome_casa": teams['home']['name'],
            "logo_casa": teams['home']['logo'],
            "gol_casa": goals['home'],
            "id_trasferta": teams['away']['id'],
            "nome_trasferta": teams['away']['name'],
            "logo_trasferta": teams['away']['logo'],
            "gol_trasferta": goals['away'],
            "arbitro": fixture['referee']
        }
        
        res = requests.post(url_supabase, json=dati_partita, headers=headers_supabase)
        if res.status_code not in [200, 201]:
            print(f"❌ Errore partita ID {fixture['id']}: {res.status_code}")
            
    print("\n✅ CALENDARIO COMPLETAMENTE CARICATO SU SUPABASE! Nessun blocco, tutto nel cloud.")
else:
    print(f"❌ Errore API-Football: {response_football.status_code}")