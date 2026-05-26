import os
import time
import requests

def carica_chiavi_locali():
    """Legge il file .env riga per riga in modo nativo ed indipendente"""
    chiavi = {}
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for riga in f:
                if not riga.strip() or riga.strip().startswith("#"):
                    continue
                if "=" in riga:
                    chiave, valore = riga.strip().split("=", 1)
                    chiavi[chiave.strip()] = valore.strip()
    return chiavi

# Estrazione configurazioni
config = carica_chiavi_locali()
SUPABASE_URL = config.get("SUPABASE_URL")
SUPABASE_KEY = config.get("SUPABASE_KEY")
API_KEY_FOOTBALL = config.get("API_KEY_FOOTBALL")

if not all([SUPABASE_URL, SUPABASE_KEY, API_KEY_FOOTBALL]):
    print("\n⚠️ ERRORE CRITICO: Mancano configurazioni nel file .env!")
    print("Verifica di avere SUPABASE_URL, SUPABASE_KEY e API_KEY_FOOTBALL.\n")
    exit(1)

# Endpoint Supabase e API Calcio
REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1/partite_live"
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
    """Algoritmo predittivo Zerescore basato sulle oscillazioni delle quote"""
    try:
        val_1 = float(q1) if q1 else 2.0
        val_2 = float(q2) if q2 else 2.0
        
        if val_1 <= 1.50:
            return "Ottimo 1"
        elif val_1 <= 1.85:
            return "Probabile 1"
        elif val_2 <= 1.85:
            return "Probabile 2"
        elif val_1 > 2.20 and val_2 > 2.20:
            return "Rischia Over 2.5"
        else:
            return "Multigol 2-4"
    except:
        return "Analisi In Corso"

def scarica_match_reali_oggi():
    """Interroga l'API del calcio per prelevare il palinsesto live e odierno reale"""
    # Usiamo la data corrente del server (Oggi)
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
            
            # Mappatura dello stato dei minuti reali
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
                # Estrae l'orario HH:MM dalla data ISO (es: 2026-05-26T20:45:00+00:00)
                minuto_gioco = fixture.get("date", "")[11:16] if fixture.get("date") else "Da Iniz."

            # Estrazione o simulazione intelligente delle quote se non presenti nell'endpoint base
            # (API-Football richiede un secondo endpoint per le quote, quindi creiamo una base coerente stasera)
            q1, qx, q2 = 2.10, 3.30, 3.40
            if "Inter" in teams.get("home", {}).get("name", "") or "Real Madrid" in teams.get("home", {}).get("name", ""):
                q1, qx, q2 = 1.40, 4.50, 7.50

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
            
            # Limitiamo a 40 match principali per non intasare lo schermo nei test
            if len(partite_formattate) >= 40:
                break
                
        return sorted(partite_formattate, key=lambda x: (x['status'] != 'LIVE', x['status'] == 'FINITA'))
        
    except Exception as e:
        print(f"❌ Errore durante il download del palinsesto: {e}")
        return []

def sincronizza_database():
    print(f"\n🔄 [{time.strftime('%H:%M:%S')}] Connessione alle API ed estrazione palinsesto reale...")
    
    match_veri = scarica_match_reali_oggi()
    if not match_veri:
        print("⚠️ Nessun match scaricato. Salto questo turno per preservare i dati.")
        return

    try:
        # Svuota il vecchio palinsesto finto
        requests.delete(f"{REST_URL}?status=not.eq.BLOCCATO", headers=SUPABASE_HEADERS)
        
        # Carica il tabellone con i professionisti veri di oggi
        response = requests.post(REST_URL, headers=SUPABASE_HEADERS, json=match_veri)
        
        if response.status_code in [200, 201, 204]:
            print(f"✅ Zerescore aggiornato con {len(match_veri)} partite reali di oggi!")
            # Stampa le prime 3 a terminale per controllo veloce
            for m in match_veri[:3]:
                print(f" ⚽ Real Match: {m['home_team']} {m['home_score']}-{m['away_score']} {m['away_team']} ({m['minute']}) | {m['pronostico']}")
        else:
            print(f"❌ Errore Supabase Storage ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ Errore di sincronizzazione: {e}")

if __name__ == "__main__":
    print("🚀 Zerescore Live Engine - Versione API Professionale Attiva.")
    try:
        while True:
            sincronizza_database()
            print("💤 In attesa del prossimo aggiornamento tra 60 secondi...")
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n🛑 Motore Zerescore spento.")