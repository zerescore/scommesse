import os
import requests

# --- CONFIGURAZIONE CREDENZIALI (Local fallback + Cloud Environment) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qfshfjphjshrpwdnsekn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD")
API_KEY_FOOTBALL = os.environ.get("dbbb7986bcaeb46218aac93cc169e420")

# Pulizia e formattazione URL per le chiamate REST dirette a Supabase
clean_sb_url = SUPABASE_URL.strip("/")
headers_supabase = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # Equivalente all'upsert (aggiorna se esiste)
}

# Mappa dei campionati estesi inseriti: Top Europei, Seconde Divisioni, Estivi e Coppe
ID_CAMPIONATI = [135, 39, 140, 78, 61, 136, 40, 141, 71, 253, 113, 2, 3, 848, 1]

def handler(request):
    """
    Funzione di ingresso principale REST nativa senza dipendenze supabase-py
    """
    print("🚀 Avvio Script di Sincronizzazione Direct-REST Zerescore...")
    headers_api = {
        "x-apisports-key": API_KEY_FOOTBALL
    }
    
    totale_chiamate_generate = 0

    for id_lega in ID_CAMPIONATI:
        if id_lega in [71, 253, 113]:
            stagione_torneo = 2026
        else:
            stagione_torneo = 2025
            
        print(f"--- Iniezione Campionato ID: {id_lega} (Stagione {stagione_torneo}) ---")

        # 1. SCARICAMENTO CLASSIFICHE
        url_c = f"https://v3.football.api-sports.io/standings?league={id_lega}&season={stagione_torneo}"
        try:
            res = requests.get(url_c, headers=headers_api)
            totale_chiamate_generate += 1
            dati = res.json()
            if datos := dati.get("response"):
                print(f" Classifica scaricata con successo per lega {id_lega}")
                for item in datos[0]["league"]["standings"][0]:
                    s_id = item["team"]["id"]
                    payload = {
                        "id_squadra": s_id,
                        "nome_squadra": item["team"]["name"],
                        "posizione": item["rank"],
                        "punti": item["points"],
                        "partite_giocate": item["all"]["played"],
                        "vittorie": item["all"]["win"],
                        "pareggi": item["all"]["draw"],
                        "sconfitte": item["all"]["lose"],
                        "gol_fatti": item["all"]["goals"]["for"],
                        "gol_subiti": item["all"]["goals"]["against"],
                        "forma": item.get("form", "N/A")
                    }
                    requests.post(f"{clean_sb_url}/rest/v1/classifica", headers=headers_supabase, json=payload)
        except Exception as e:
            print(f"❌ Errore classifica per lega {id_lega}: {e}")

        # 2. SCARICAMENTO PARTITE
        url_p = f"https://v3.football.api-sports.io/fixtures?league={id_lega}&season={stagione_torneo}"
        try:
            res = requests.get(url_p, headers=headers_api)
            totale_chiamate_generate += 1
            dati = res.json()
            if datos := dati.get("response"):
                print(f" Elenco partite scaricato ({len(datos)} match trovati) per lega {id_lega}")
                for match in datos:
                    f_id = match["fixture"]["id"]
                    status = match["fixture"]["status"]["short"]
                    
                    match_data = {
                        "id": f_id,
                        "id_campionato": id_lega,
                        "stagione": stagione_torneo,
                        "giornata": match["league"]["round"],
                        "data_ora": match["fixture"]["date"],
                        "stato": status,
                        "id_casa": match["teams"]["home"]["id"],
                        "nome_casa": match["teams"]["home"]["name"],
                        "logo_casa": match["teams"]["home"]["logo"],
                        "id_trasferta": match["teams"]["away"]["id"],
                        "nome_trasferta": match["teams"]["away"]["name"],
                        "logo_trasferta": match["teams"]["away"]["logo"],
                        "gol_casa": match["goals"]["home"],
                        "gol_trasferta": match["goals"]["away"]
                    }
                    requests.post(f"{clean_sb_url}/rest/v1/partite_avanzate", headers=headers_supabase, json=match_data)
        except Exception as e:
            print(f"❌ Errore incontri per lega {id_lega}: {e}")

        # 3. SCARICAMENTO INFORTUNI
        url_i = f"https://v3.football.api-sports.io/injuries?league={id_lega}&season={stagione_torneo}"
        try:
            res = requests.get(url_i, headers=headers_api)
            totale_chiamate_generate += 1
            dati = res.json()
            if datos := dati.get("response"):
                print(f" Infortuni mappati per lega {id_lega}: {len(datos)} record rilevati")
                for inf in datos:
                    payload_inf = {
                        "id_partita": inf["fixture"]["id"],
                        "id_squadra": inf["team"]["id"],
                        "nome_squadra": inf["team"]["name"],
                        "id_giocatore": inf["player"]["id"],
                        "nome_giocatore": inf["player"]["name"],
                        "tipo_assenza": inf["player"].get("type", "Injury"),
                        "dettaglio": inf["player"].get("reason", "Unknown Injury")
                    }
                    requests.post(f"{clean_sb_url}/rest/v1/infortuni", headers=headers_supabase, json=payload_inf)
        except Exception as e:
            print(f"❌ Errore infortuni per lega {id_lega}: {e}")

        # 4. SCARICAMENTO ANAGRAFICA CALCIATORI
        for pagina in range(1, 4):
            url_r = f"https://v3.football.api-sports.io/players?league={id_lega}&season={stagione_torneo}&page={pagina}"
            try:
                res = requests.get(url_r, headers=headers_api)
                totale_chiamate_generate += 1
                dati = res.json()
                if datos := dati.get("response"):
                    for p_item in datos:
                        player_id = p_item["player"]["id"]
                        stats_node = p_item["statistics"][0]
                        payload_plr = {
                            "id_giocatore": player_id,
                            "id_squadra": stats_node["team"]["id"],
                            "nome_giocatore": p_item["player"]["name"],
                            "posizione": stats_node["games"]["position"],
                            "partite_totali": stats_node["games"]["appeard"] or 0,
                            "minuti_giocati": stats_node["games"]["minutes"] or 0,
                            "gol_fatti": stats_node["goals"]["total"] or 0,
                            "assist_fatti": stats_node["goals"]["assists"] or 0,
                            "cartellini_gialli": stats_node["cards"]["yellow"] or 0,
                            "cartellini_rossi": stats_node["cards"]["red"] or 0
                        }
                        requests.post(f"{clean_sb_url}/rest/v1/rose_squadre", headers=headers_supabase, json=payload_plr)
                else:
                    break
            except Exception as e:
                print(f"❌ Errore giocatori pagina {pagina} per lega {id_lega}: {e}")
                break

    # 5. SCRITTURA LOG CONSUMO CREDITI SU SUPABASE via REST
    try:
        payload_log = {
            "operazione": "Allineamento Notturno Automatico (All Leagues)",
            "chiamate_consumate": totale_chiamate_generate
        }
        requests.post(f"{clean_sb_url}/rest/v1/log_crediti", headers=headers_supabase, json=payload_log)
        print(f" Allineamento terminato correttamente. Registrate {totale_chiamate_generate} chiamate API.")
    except Exception as e:
        print(f"Impossibile salvare il log dei crediti: {e}")

    return {
        "statusCode": 200,
        "body": f"Sincronizzazione completata con successo! Chiamate API consumate: {totale_chiamate_generate}"
    }

if __name__ == "__main__":
    handler(None)