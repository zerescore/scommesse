import requests

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

# Puliamo l'URL di Supabase se finisce con lo slash /
if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# 1. Scarichiamo i dati da API-Football
url_football = "https://v3.football.api-sports.io/leagues"
headers_football = {'x-apisports-key': API_KEY_FOOTBALL}

print("Sto scaricando i campionati da API-Football...")
response_football = requests.get(url_football, headers=headers_football)

if response_football.status_code == 200:
    dati = response_football.json()
    print("Download completato. Inizio l'inserimento su Supabase...")
    
    # Prepariamo la connessione diretta a Supabase via HTTP REST API
    # Usiamo 'on_conflict=id' per simulare l'upsert (aggiorna se esiste già)
    url_supabase = f"{SUPABASE_URL}/rest/v1/campionati?on_conflict=id"
    headers_supabase = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" # Questo fa l'upsert automatico
    }
    
    # Prendiamo i primi 15 campionati per il test
    for item in dati['response'][:15]:
        league = item['league']
        country = item['country']
        
        dati_campionato = {
            "id": league['id'],
            "nome": league['name'],
            "paese": country['name'],
            "codice_paese": country['code'],
            "logo": league['logo']
        }
        
        # Inviamo il singolo campionato direttamente al database cloud
        res = requests.post(url_supabase, json=dati_campionato, headers=headers_supabase)
        
        if res.status_code in [200, 201]:
            print(f"⚽ Salvato nel cloud: {league['name']} ({country['name']})")
        else:
            print(f"❌ Errore salvataggio {league['name']}: {res.status_code} - {res.text}")
            
    print("\n✅ OPERAZIONE COMPLETATA SENZA LIBRERIE COMPLESSE! Controlla la tabella su Supabase.")
else:
    print(f"❌ Errore API-Football: {response_football.status_code}")