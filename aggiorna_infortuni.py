import requests

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# Interroghiamo gli infortuni della Serie A (135) per la stagione attuale (2025)
url_football = "https://v3.football.api-sports.io/injuries?league=135&season=2025"
headers_football = {'x-apisports-key': API_KEY_FOOTBALL}

print("🏥 Recupero della lista infortuni e squalifiche aggiornata da API-Football...")
response_football = requests.get(url_football, headers=headers_football)

if response_football.status_code == 200:
    dati = response_football.json().get('response', [])
    print(f"✅ Trovati {len(dati)} calciatori attualmente assenti. Sincronizzazione con Supabase...")
    
    url_supabase = f"{SUPABASE_URL}/rest/v1/infortuni"
    headers_supabase = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" # Sovrascrive se già presente
    }
    
    contatore = 0
    for item in dati:
        fixture = item['fixture']
        team = item['team']
        player = item['player']
        
        dati_assente = {
            "id_partita": fixture['id'],
            "id_squadra": team['id'],
            "nome_squadra": team['name'],
            "id_giocatore": player['id'],
            "nome_giocatore": player['name'],
            "tipo_assenza": player['type'],      # 'Injury' o 'Missing'
            "dettaglio": player['reason']        # es. 'Knee Injury', 'Suspended'
        }
        
        # Inviamo il dato a Supabase
        res = requests.post(url_supabase, json=dati_assente, headers=headers_supabase)
        if res.status_code in [200, 201]:
            contatore += 1
            
    print(f"🚑 TABELLA INFORTUNI ALLINEATA! {contatore} record inseriti nel cloud.")
else:
    print(f"❌ Errore API-Football: {response_football.status_code}")