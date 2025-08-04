    const betaData = await betaRes.json();

    const beta = betaData.metric && betaData.metric.beta ? parseFloat(betaData.metric.beta) : 1;
    betaSum += beta * market_value;
    const direction = market_value >= 0 ? 1 : -1;
    betaSum += beta * Math.abs(market_value) * direction;

    totalValue += market_value;
  }
