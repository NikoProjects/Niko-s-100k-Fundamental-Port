export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  const response = await fetch(`https://paper-api.alpaca.markets/v2/account/activities?activity_types=FILL`, {
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
      'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
    }
  });

  const data = await response.json();

  const formatted = data.map((t) => ({
    date: t.transaction_time ? new Date(t.transaction_time).toISOString().split('T')[0] : t.date,
    symbol: t.symbol,
    side: t.side,
    qty: t.qty,
    price: parseFloat(t.price),
    beta: 1, // Placeholder until you calculate real beta per trade
    id: t.id
  }));

  res.status(200).json(formatted);
}
