import requests

# --- CONFIGURAZIONE CREDENZIALI ---
API_KEY_FOOTBALL = "dbbb7986bcaeb46218aac93cc169e420"
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

if SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL[:-1]

# Chiediamo la classifica della Serie A (135) per la stagione attuale (2025)
url_football = "https://v3.football.api-sports.io/standings?league=135&season=2025"
headers_football = {'x-apisports-key': API_KEY_FOOTBALL}

print("📊 Recupero della classifica aggiornata da API-Football...")
response_football = requests.get(url_football, headers=headers_football)

if response_football.status_code == 200:
    dati = response_football.json().get('response', [])
    
    if dati:
        # La struttura della classifica è annidata dentro league -> standings
        classifica_api = dati[0]['league']['standings'][0]
        print(f"✅ Classifica ricevuta. Sincronizzazione di tutte le 20 squadre con Supabase...")
        
        url_supabase = f"{SUPABASE_URL}/rest/v1/classifica?on_conflict=id_squadra"
        headers_supabase = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        for team_data in classifica_api:
            team = team_data['team']
            all_stats = team_data['all'] # Statistiche totali (casa + trasferta)
            
            dati_riga = {
                "id_squadra": team['id'],
                "nome_squadra": team['name'],
                "posizione": team_data['rank'],
                "punti": team_data['points'],
                "partite_giocate": all_stats['played'],
                "vittorie": all_stats['win'],
                "pareggi": all_stats['draw'],
                "sconfitte": all_stats['lose'],
                "gol_fatti": all_stats['goals']['for'],
                "gol_subiti": all_stats['goals']['against'],
                "forma": team_data['form'] # es. "WWDLD"
            }
            
            requests.post(url_supabase, json=dati_riga, headers=headers_supabase)
            
        print("🏆 TABELLA CLASSIFICA AGGIORNATA CON SUCCESSO!")
    else:
        print("⚠️ Nessun dato di classifica trovato per questa stagione.")
else:
    print(f"❌ Errore API-Football: {response_football.status_code}")