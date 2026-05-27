import requests

API_KEY = "dbbb7986bcaeb46218aac93cc169e420"
url = "https://v3.football.api-sports.io/teams?league=135&season=2024"

headers = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

risposta = requests.get(url, headers=headers)
print("\n🔍 RISPOSTA REALE DEL SERVER API-FOOTBALL:\n")
print(risposta.json())