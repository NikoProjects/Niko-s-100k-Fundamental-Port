export default async function handler(req, res) {
  const { ALPACA_API_KEY_ID, ALPACA_SECRET_KEY } = process.env;

  try {
    const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY_ID,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch account data' });
    }

    const data = await response.json();

    res.status(200).json({
      date: new Date().toISOString(),
      equity: parseFloat(data.equity),
    });
  } catch (error) {
    console.error('Error fetching equity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
