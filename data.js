/**
 * ZeroScoreV2 - Gestore Modulo Dati (data.js)
 */
import { supabaseClient } from './supabase-client.js';

/**
 * Recupera l'intero palinsesto e lo storico dei match dal database Supabase.
 * @returns {Promise<Array>} Array di oggetti partita o array vuoto in caso di errore.
 */
async function load() {
    try {
        // Interroghiamo la tabella 'partite' prendendo tutti i campi disponibili
        let { data: partite, error } = await supabaseClient
            .from('partite')
            .select('*');
            
        if (error) throw error;
        return partite || [];
    } catch (error) {
        console.error("❌ Errore durante il caricamento da Supabase:", error.message);
        return [];
    }
}

/**
 * Recupera lo scraping in tempo reale delle partite Live attive a livello mondiale.
 * @returns {Promise<Array>} Array di oggetti match live aggiornati o array vuoto.
 */
async function fetchLiveScraping() {
    try {
        const response = await fetch('/api/live-public.js');
        if (!response.ok) throw new Error(`Serverless API ha risposto con status: ${response.status}`);
        
        const dataLive = await response.json();
        return Array.isArray(dataLive) ? dataLive : [];
    } catch (error) {
        console.error("❌ Errore durante il recupero dello scraping Live:", error.message);
        return [];
    }
}

// Esportiamo il modulo dati pulito per essere utilizzato dal regista dell'app
export const DataModule = { 
    load, 
    fetchLiveScraping 
};