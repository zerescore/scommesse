import os
import time
import requests

def carica_chiavi_locali():
    """Legge il file .env in modo super flessibile eliminando spazi o caratteri spuri"""
    chiavi = {}
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            for riga in f:
                riga_pulita = riga.strip()
                # Salta righe vuote o commenti
                if not riga_pulita or riga_pulita.startswith("#"):
                    continue
                if "=" in riga_pulita:
                    chiave, valore = riga_pulita.split("=", 1)
                    # Puliamo spazi bianchi extra ai lati di chiave e valore
                    chiavi[chiave.strip()] = valore.strip()
    return chiavi

# Configurazione iniziale chiavi
config = carica_chiavi_locali()
SUPABASE_URL = config.get("https://qfshfjphjshrpwdnsekn.supabase.co")
SUPABASE_KEY = config.get("sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD")
API_KEY_FOOTBALL = config.get("dbbb7986bcaeb46218aac93cc169e420")

# Stampiamo un feedback chiaro a terminale per capire cosa viene letto
print("\n--- [DIAGNOSTICA .ENV] ---")
print(f"🔹 SUPABASE_URL trovato: {'SÌ ✅' if SUPABASE_URL else 'NO ❌'}")
print(f"🔹 SUPABASE_KEY trovato: {'SÌ ✅' if SUPABASE_KEY else 'NO ❌'}")
print(f"🔹 API_KEY_FOOTBALL trovato: {'SÌ ✅' if API_KEY_FOOTBALL else 'NO ❌'}")
print("--------------------------\n")

if not all([SUPABASE_URL, SUPABASE_KEY, API_KEY_FOOTBALL]):
    print("⚠️ ERRORE: Il file .env è formattato male o mancano delle chiavi. Controllalo!")
    exit(1)

# Endpoint corretto al singolare 'partita_live'
REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1/partita_live"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

FOOTBALL_API_URL = "https://v3.football.api-sports.io/fixtures"
FOOTBALL_HEADERS = {
    "x-rapidapi-key": API_KEY_FOOTBALL,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

def elabora_pronostico(q1, qx, q2):
    try:
        v1 = float(q1)
        if v1 <= 1.50: return "Ottimo 1"
        elif v1 <= 1.85: return "Probabile 1"
        elif float(q2) <= 1.85: return "Probabile 2"
        else: return "Multigol 2-4"
    except:
        return "Analisi Live"

def scarica_match_reali_oggi():
    data_oggi = time.strftime("%Y-%m-%d")
    params = {"date": data_oggi}
    
    try:
        response = requests.get(FOOTBALL_API_URL, headers=FOOTBALL_HEADERS, params=params, timeout=15)
        if response.status_code != 200:
            print(f"❌ Errore API Calcio (Stato {response.status_code})")
            return []
            
        risultati = response.json().get("response", [])
        partite_formattate = []
        
        for item in risultati:
            fixture = item.get("fixture", {})
            league = item.get("league", {})
            teams = item.get("teams", {})
            goals = item.get("goals", {})
            status_short = fixture.get("status", {}).get("short")
            elapsed = fixture.get("status", {}).get("elapsed")
            
            if status_short in ["1H", "2H", "HT"]:
                stato_match = "LIVE"
                minuto_gioco = f"{elapsed}'" if elapsed else "LIVE"
            elif status_short in ["FT", "AET", "PEN"]:
                stato_match = "FINITA"
                minuto_gioco = "FT"
            else:
                stato_match = "OGGI"
                minuto_gioco = fixture.get("date", "")[11:16] if fixture.get("date") else "Da Iniz."

            q1, qx, q2 = 2.10, 3.20, 3.40
            pronostico_calcolato = elabora_pronostico(q1, qx, q2)
            
            partita = {
                "campionato": f"{league.get('country', '')} - {league.get('name', '')}",
                "home_team": teams.get("home", {}).get("name", "Casa"),
                "away_team": teams.get("away", {}).get("name", "Fuori"),
                "home_score": goals.get("home") if goals.get("home") is not None else 0,
                "away_score": goals.get("away") if goals.get("away") is not None else 0,
                "status": stato_match,
                "minute": minuto_gioco,
                "quota_1": q1,
                "quota_x": qx,
                "quota_2": q2,
                "pronostico": pronostico_calcolato
            }
            partite_formattate.append(partita)
            
            if len(partite_formattate) >= 35:
                break
                
        return partite_formattate
    except Exception as e:
        print(f"❌ Errore scaricamento dati API: {e}")
        return []

def sincronizza_database():
    print(f"\n🔄 [{time.strftime('%H:%M:%S')}] Connessione e recupero palinsesto reale...")
    match_veri = scarica_match_reali_oggi()
    
    if not match_veri:
        print("⚠️ Palinsesto vuoto o errore API. Attendo il prossimo ciclo.")
        return

    try:
        requests.delete(f"{REST_URL}?status=not.eq.BLOCCATO", headers=SUPABASE_HEADERS)
        response = requests.post(REST_URL, headers=SUPABASE_HEADERS, json=match_veri)
        if response.status_code in [200, 201, 204]:
            print(f"✅ Sincronizzazione riuscita! {len(match_veri)} match inseriti in 'partita_live'.")
        else:
            print(f"❌ Errore di scrittura Supabase ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ Errore di connessione a Supabase: {e}")

if __name__ == "__main__":
    print("🚀 Zerescore Core Engine - Connessione Diretta Attiva.")
    try:
        while True:
            sincronizza_database()
            print("💤 In attesa del prossimo ciclo tra 60 secondi...")
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n🛑 Motore spento.")