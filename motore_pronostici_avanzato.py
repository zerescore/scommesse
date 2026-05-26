import requests

# --- CREDENZIALI ---
SUPABASE_URL = "https://qfshfjphjshrpwdnsekn.supabase.co"
SUPABASE_KEY = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD"

def calcola_peso_motivazione(giornata, punti_casa, punti_trasf, obiettivo_casa, obiettivo_trasf):
    """
    LIVELLO 2: Calcola l'importanza del match.
    Se siamo oltre la giornata 30, i punti pesano il triplo per chi lotta per la retrocessione o lo scudetto!
    """
    correttore_casa = 1.0
    correttore_trasf = 1.0
    
    # Estraiamo il numero della giornata (es. da "Regular Season - 32" prendiamo 32)
    numero_giornata = int(''.join(filter(str.isdigit, giornata))) if any(char.isdigit() for char in giornata) else 20
    
    if numero_giornata > 30:
        # Esempio: Squadra in casa lotta per non retrocedere, ospite a metà classifica senza stimoli
        if obiettivo_casa == "Salvezza" and obiettivo_trasf == "Nessuno":
            correttore_casa += 0.15  # Spinta del +15% per la squadra di casa
            correttore_trasf -= 0.10 # Calo del -10% per gli ospiti demotivati
            
    return correttore_casa, correttore_trasf

def analizza_impatto_assenti(id_partita, id_casa, id_trasferta):
    """
    LIVELLO 2: Controlla quanti giocatori chiave mancano.
    Ritorna un moltiplicatore di forza per la squadra.
    """
    # Qui interrogheremo la tabella 'infortuni' appena creata
    # Se mancano i top player, il coefficiente scende
    malus_casa = 0.0
    malus_trasferta = 0.0
    
    # Struttura di calcolo concettuale:
    # Per ogni giocatore assente che era un titolare -> malus += 0.05 (toglie il 5% di forza)
    
    return (1.0 - malus_casa), (1.0 - malus_trasferta)

def genera_pronostico_totale(id_partita, id_casa, id_trasferta, id_campionato, giornata):
    print(f"🧠 Elaborazione Pronostico Avanzato per la partita ID: {id_partita}")
    
    # 1. LIVELLO 1: Statistica Pura (Prendiamo le medie di Gol/Angoli/Cartellini calcolate prima)
    media_gol_casa = 1.65  # Dato temporaneo di esempio estratto da Supabase
    media_gol_trasf = 1.10 # Dato temporaneo di esempio estratto da Supabase
    
    # 2. LIVELLO 2: Contesto (Infortuni e Motivazione)
    # Supponiamo che la casa lotti per la salvezza e gli ospiti non abbiano obiettivi
    peso_mot_casa, peso_mot_trasf = calcola_peso_motivazione(giornata, 30, 48, "Salvezza", "Nessuno")
    forza_infortuni_casa, forza_infortuni_trasf = analizza_impatto_assenti(id_partita, id_casa, id_trasferta)
    
    # Applichiamo i correttori contestuali alle medie matematiche
    proiezione_finale_casa = media_gol_casa * peso_mot_casa * forza_infortuni_casa
    proiezione_finale_trasf = media_gol_trasf * peso_mot_trasf * forza_infortuni_trasf
    
    somma_gol_stimati = proiezione_finale_casa + proiezione_finale_trasf
    
    print("\n--- RISULTATO INTELLIGENZA PREDITTIVA ---")
    print(f"⚽ Gol stimati Casa (corretti): {proiezione_finale_casa:.2f}")
    print(f"⚽ Gol stimati Trasferta (corretti): {proiezione_finale_trasf:.2f}")
    print(f"📊 Totale Gol Attesi nel Match: {somma_gol_stimati:.2f}")
    
    # 3. LIVELLO 3: Analisi del valore della quota (Value Bet)
    quota_under_25_bookmaker = 1.95 # Questo dato arriverà dall'endpoint odds
    
    print("\n🔮 VERDETTO ALGORITMO:")
    if somma_gol_stimati < 2.10 and quota_under_25_bookmaker >= 1.80:
        print("💰 VALUE BET RILEVATA: Giocare UNDER 2.5 (La quota del bookmaker è troppo alta rispetto alla probabilità reale!)")
    else:
        print("⚠️ Nessun valore rilevato sulle quote correnti. Passare al prossimo match.")

# Esecuzione di test concettuale
# genera_pronostico_totale(1044221, 489, 496, 135, "Regular Season - 33")