export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  const response = await fetch('https://paper-api.alpaca.markets/v2/orders?status=filled&direction=desc&limit=100', {
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
      'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return res.status(response.status).json({ error });
  }

  const orders = await response.json();

  const formatted = orders.map(order => ({
    date: new Date(order.filled_at).toISOString().split('T')[0],
    symbol: order.symbol,
    side: order.side,
    qty: parseFloat(order.filled_qty),
    price: parseFloat(order.filled_avg_price),
    beta: 1, // You can replace this later with actual beta lookup
    id: order.id
  }));

  res.status(200).json(formatted);
}
