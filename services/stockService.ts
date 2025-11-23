
// Service to fetch stock data from Tencent Finance (qt.gtimg.cn)
// This avoids using Gemini tokens for simple price checks and prevents 429 errors.

// Symbol conversion helper
const formatSymbolForTencent = (symbol: string): string | null => {
  const s = symbol.toUpperCase();
  
  // HK Stocks: 0700.HK -> hk00700
  if (s.endsWith('.HK')) {
    return `hk${s.replace('.HK', '')}`;
  }
  
  // A-Shares Shanghai: 600519.SS -> sh600519
  if (s.endsWith('.SS')) {
    return `sh${s.replace('.SS', '')}`;
  }
  
  // A-Shares Shenzhen: 300750.SZ -> sz300750
  if (s.endsWith('.SZ')) {
    return `sz${s.replace('.SZ', '')}`;
  }
  
  // US Stocks: AAPL -> usAAPL, NVDA -> usNVDA
  // Simple check: if no dot, assume US (unless it's a known crypto handled elsewhere)
  if (!s.includes('.')) {
    return `us${s}`;
  }

  return null;
};

interface StockData {
  symbol: string;
  price: number;
  changePercent: number;
  name?: string;
}

export const fetchStockPrices = async (symbols: string[]): Promise<StockData[]> => {
  const symbolMap = new Map<string, string>(); // tencentCode -> originalSymbol
  const tencentCodes: string[] = [];

  symbols.forEach(sym => {
    const code = formatSymbolForTencent(sym);
    if (code) {
      tencentCodes.push(code);
      symbolMap.set(code, sym);
    }
  });

  if (tencentCodes.length === 0) return [];

  try {
    // Use a CORS proxy to access the HTTP interface
    // qt.gtimg.cn returns data in format: v_sh600519="1~贵州茅台~600519~1700.00~..."
    const query = tencentCodes.join(',');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://qt.gtimg.cn/q=${query}`)}`;
    
    const response = await fetch(proxyUrl);
    const text = await response.text();
    
    const results: StockData[] = [];

    // Parse response
    const lines = text.split(';');
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Extract code: v_sh600519=...
      const match = line.match(/v_([a-zA-Z0-9]+)="(.*)"/);
      if (match) {
        const tencentCode = match[1];
        const dataStr = match[2];
        const parts = dataStr.split('~');
        
        // Tencent Data Index:
        // 1: Name
        // 3: Current Price
        // 31: Change Amount
        // 32: Change Percent
        
        const originalSymbol = symbolMap.get(tencentCode);
        if (originalSymbol && parts.length > 32) {
          results.push({
            symbol: originalSymbol,
            name: parts[1],
            price: parseFloat(parts[3]),
            changePercent: parseFloat(parts[32])
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.warn("Stock API fetch failed, falling back to AI", error);
    return [];
  }
};
