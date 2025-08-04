export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  const response = await fetch('https://paper-api.alpaca.markets/v2/account/activities?activity_types=FILL', {
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
      'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
    }
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch trade data' });
  }

  const activities = await response.json();

  // Format the trades to match your frontend
  const trades = activities.map(trade => ({
    date: new Date(trade.transaction_time).toISOString().split('T')[0],
    symbol: trade.symbol,
    side: trade.side,
    qty: parseFloat(trade.qty),
    price: parseFloat(trade.price),
    beta: 1.0,  // Optional: Replace this if you want to fetch real beta per trade
    id: trade.id || trade.order_id
  }));

  res.status(200).json(trades);
}
