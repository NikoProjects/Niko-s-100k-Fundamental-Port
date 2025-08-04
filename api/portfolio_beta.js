export default async function handler(req, res) {
  const { FINNHUB_API_KEY, ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  try {
    const positionsRes = await fetch('https://paper-api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      }
    });

    if (!positionsRes.ok) {
      return res.status(positionsRes.status).json({ error: 'Failed to fetch positions' });
    }

    const positions = await positionsRes.json();
    let betaSum = 0;
    let totalValue = 0;

    for (const pos of positions) {
      const ticker = pos.symbol;
      const market_value = parseFloat(pos.market_value);

      const betaRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`);
      const betaData = await betaRes.json();

      const beta = betaData.metric?.beta ? parseFloat(betaData.metric.beta) : 1;
      const direction = market_value >= 0 ? 1 : -1;

      betaSum += beta * Math.abs(market_value) * direction;
      totalValue += Math.abs(market_value); // Always positive
    }

    const portfolioBeta = totalValue ? (betaSum / totalValue).toFixed(2) : 0;
    res.status(200).json({ portfolio_beta: portfolioBeta });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
