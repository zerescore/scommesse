/**
 * ZeroScoreV2 - Configurazione e Inizializzazione Client Supabase
 */

const supabaseUrl = "https://qfshfjphjshrpwdnsekn.supabase.co";
const supabaseKey = "sb_publishable_04abaz97o0BG-VDl-kyHVg_d4zgdDqD";

// Creazione del client sfruttando la libreria caricata globalmente nell'index
export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);