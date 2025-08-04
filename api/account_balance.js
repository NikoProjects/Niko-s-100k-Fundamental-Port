export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
      'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
    }
  });

  const data = await response.json();
  res.status(200).json({ equity: parseFloat(data.equity) });
}
