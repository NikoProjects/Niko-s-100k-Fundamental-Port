export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  try {
    // Get account activities (trades that were filled)
    const activitiesRes = await fetch('https://paper-api.alpaca.markets/v2/account/activities?activity_types=FILL', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      }
    });

    if (!activitiesRes.ok) {
      return res.status(activitiesRes.status).json({ error: 'Failed to fetch trade activity' });
    }

    const trades = await activitiesRes.json();

    // Group trades by date
    const pnlMap = {};
    for (const trade of trades) {
      const date = new Date(trade.transaction_time).toISOString().split('T')[0];
      const qty = parseFloat(trade.qty);
      const price = parseFloat(trade.price);
      const side = trade.side.toLowerCase();

      const cost = qty * price * (side === 'buy' ? -1 : 1);

      if (!pnlMap[date]) pnlMap[date] = 0;
      pnlMap[date] += cost;
    }

    // Turn into cumulative P&L
    const sortedDates = Object.keys(pnlMap).sort();
    const result = [];
    let cumulative = 0;

    for (const date of sortedDates) {
      cumulative += pnlMap[date];
      result.push({ date, pnl: cumulative });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('Error in pnl.js:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
