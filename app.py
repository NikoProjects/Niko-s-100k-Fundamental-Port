import os
from flask import Flask, jsonify, send_from_directory
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

ALPACA_API_KEY = os.getenv("ALPACA_API_KEY_ID")
ALPACA_SECRET = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL = "https://paper-api.alpaca.markets"
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

HEADERS = {
    "APCA-API-KEY-ID": ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET
}

app = Flask(__name__, static_folder='static')

@app.route("/")
def index():
    return send_from_directory('static', 'index.html')

@app.route("/pnl")
def pnl():
    url = f"{ALPACA_BASE_URL}/v2/account/portfolio/history?period=1Y&timeframe=1D"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    pnl_data = []
    first_equity = None
    for ts, eq in zip(data['timestamp'], data['equity']):
        if first_equity is None:
            first_equity = eq
        pnl_data.append({
            "date": ts.split("T")[0],
            "equity": eq,
            "pnl": eq - first_equity
        })
    return jsonify(pnl_data)

def get_beta(symbol):
    """Fetch beta from Finnhub API for a given symbol"""
    try:
        url = f"{FINNHUB_BASE_URL}/stock/metric?symbol={symbol}&metric=all&token={FINNHUB_API_KEY}"
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        beta = data.get("metric", {}).get("beta")
        if beta is None:
            beta = 1.0  # fallback beta
        return beta
    except Exception as e:
        print(f"Error fetching beta for {symbol}: {e}")
        return 1.0

@app.route("/trades")
def trades():
    url = f"{ALPACA_BASE_URL}/v2/account/activities"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    beta_cache = {}

    simplified = []
    for t in data:
        symbol = t["symbol"]
        if symbol not in beta_cache:
            beta_cache[symbol] = get_beta(symbol)
        simplified.append({
            "date": t["transaction_time"].split("T")[0],
            "symbol": symbol,
            "side": t["side"],
            "qty": t["qty"],
            "price": t.get("price", 0),
            "id": t["id"],
            "beta": beta_cache[symbol]
        })
    return jsonify(simplified)

@app.route("/portfolio_beta")
def portfolio_beta():
    url = f"{ALPACA_BASE_URL}/v2/positions"
    resp = requests.get(url, headers=HEADERS)
    positions = resp.json()

    beta_cache = {}

    total_value = 0.0
    weighted_beta_sum = 0.0

    for pos in positions:
        symbol = pos["symbol"]
        qty = float(pos["qty"])
        market_value = float(pos["market_value"])
        side_sign = 1 if qty > 0 else -1

        if symbol not in beta_cache:
            beta_cache[symbol] = get_beta(symbol)
        beta = beta_cache[symbol]

        position_value = abs(market_value)
        total_value += position_value
        weighted_beta_sum += position_value * beta * side_sign

    portfolio_beta = 0.0
    if total_value > 0:
        portfolio_beta = weighted_beta_sum / total_value

    return jsonify({"portfolio_beta": round(portfolio_beta, 3)})

@app.route("/account_balance")
def account_balance():
    url = f"{ALPACA_BASE_URL}/v2/account"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    equity = float(data.get("equity", 0))
    return jsonify({"equity": equity})

@app.route("/returns")
def returns():
    # Returns: 1d, 1m, 3m, 6m, 1y
    url = f"{ALPACA_BASE_URL}/v2/account/portfolio/history?period=1Y&timeframe=1D"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()

    # Extract dates and equity
    timestamps = data.get("timestamp", [])
    equity = data.get("equity", [])
    if not timestamps or not equity:
        return jsonify({"error": "No data"}), 400

    # Build date->equity dict
    date_equity = {ts.split("T")[0]: eq for ts, eq in zip(timestamps, equity)}

    # Get latest date
    latest_date_str = max(date_equity.keys())
    latest_date = datetime.strptime(latest_date_str, "%Y-%m-%d")
    latest_equity = date_equity[latest_date_str]

    def get_equity_on(date):
        d_str = date.strftime("%Y-%m-%d")
        # If exact date missing, find closest previous date
        while d_str not in date_equity and date > datetime.strptime(min(date_equity.keys()), "%Y-%m-%d"):
            date -= timedelta(days=1)
            d_str = date.strftime("%Y-%m-%d")
        return date_equity.get(d_str, None)

    periods = {
        "1d": latest_date - timedelta(days=1),
        "1m": latest_date - timedelta(days=30),
        "3m": latest_date - timedelta(days=90),
        "6m": latest_date - timedelta(days=180),
        "1y": latest_date - timedelta(days=365),
    }

    returns = {}
    for k, d in periods.items():
        past_eq = get_equity_on(d)
        if past_eq is None:
            returns[k] = None
        else:
            returns[k] = round((latest_equity - past_eq) / past_eq * 100, 2)

    return jsonify(returns)

if __name__ == "__main__":
    app.run(debug=True)
