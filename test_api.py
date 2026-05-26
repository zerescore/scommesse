import requests

API_KEY = "dbbb7986bcaeb46218aac93cc169e420" 
url = "https://v3.football.api-sports.io/status"

headers = {
    'x-apisports-key': API_KEY
}

print("Sto contattando il server di API-Football...")
response = requests.get(url, headers=headers)

if response.status_code == 200:
    dati = response.json()
    if dati.get('errors'):
        print("\n❌ Errore dall'API:", dati['errors'])
    else:
        account_info = dati['response']['account']
        richieste_info = dati['response']['requests']
        print("\n--- ✅ CONNESSIONE RIUSCITA! ---")
        print(f"Account di: {account_info['firstname']} {account_info['lastname']}")
        print(f"Chiamate usate oggi: {richieste_info['current']} su {richieste_info['limit_day']}")
else:
    print(f"\n❌ Errore di rete: {response.status_code}")