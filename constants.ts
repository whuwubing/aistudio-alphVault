
import { AssetClass, PortfolioItem, WatchlistItem } from './types';

export const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'cash_initial',
    symbol: 'CNY',
    name: '人民币现金 / 货币基金',
    assetClass: AssetClass.CASH,
    quantity: 10000000,
    avgPrice: 1,
    currentPrice: 1,
    marketValue: 10000000,
    pnl: 0,
    pnlPercent: 0,
    lastUpdated: Date.now()
  }
];

export const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w1_xau',
    symbol: 'XAUUSD',
    name: '现货黄金/美元',
    assetClass: AssetClass.PRECIOUS_METALS,
    currentPrice: 4047.79,
    currency: 'USD',
    market: 'Global',
    score: 70,
    status: 'Buy',
    lastAnalysis: '现货黄金长期看涨，受央行购买和降息预期支撑，短期技术面中性。',
    lastUpdated: Date.now()
  },
  {
    id: 'w2_0700',
    symbol: '0700.HK',
    name: '腾讯控股',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 624.5,
    currency: 'HKD',
    market: 'HK Stocks',
    score: 70,
    status: 'Buy',
    lastAnalysis: '腾讯控股基本面强劲，分析师普遍看好，目标价支持中期20%收益。',
    lastUpdated: Date.now()
  },
  {
    id: 'w3_tlt',
    symbol: 'TLT',
    name: '20年期美债ETF',
    assetClass: AssetClass.BONDS,
    currentPrice: 89.5,
    currency: 'USD',
    market: 'US Stocks',
    score: 50,
    status: 'Watch',
    lastAnalysis: 'TLT预测分歧大，技术指标中性，潜在收益依赖利率政策。',
    lastUpdated: Date.now()
  },
  {
    id: 'w4_600519',
    symbol: '600519.SS',
    name: '贵州茅台',
    assetClass: AssetClass.A_SHARES,
    currentPrice: 1452,
    currency: 'CNY',
    market: 'A-Shares',
    score: 65,
    status: 'Watch',
    lastAnalysis: '分析师看好，但增长放缓，技术面弱，建议观望。',
    lastUpdated: Date.now()
  },
  {
    id: 'w5_pdd',
    symbol: 'PDD',
    name: '拼多多',
    assetClass: AssetClass.HK_STOCKS, // Mapped to HK/US bucket
    currentPrice: 113.24,
    currency: 'USD',
    market: 'US Stocks',
    score: 45,
    status: 'Watch',
    lastAnalysis: '利润超预期但营收增速放缓；技术面超买，建议观望。',
    lastUpdated: Date.now()
  },
  {
    id: 'w6_baba',
    symbol: 'BABA',
    name: '阿里巴巴',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 152.93,
    currency: 'USD',
    market: 'US Stocks',
    score: 80,
    status: 'Buy',
    lastAnalysis: 'AI增长强劲，分析师看好，中期目标具有吸引力。',
    lastUpdated: Date.now()
  },
  {
    id: 'w7_bili',
    symbol: 'BILI',
    name: '哔哩哔哩',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 24.7,
    currency: 'USD',
    market: 'US Stocks',
    score: 75,
    status: 'Watch',
    lastAnalysis: '盈利能力显著改善，目标价支持中期上涨潜力，短期技术指标不一。',
    lastUpdated: Date.now()
  },
  {
    id: 'w8_meituan',
    symbol: '3690.HK', // Corrected from '美团' to Ticker
    name: '美团-W',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 98.35,
    currency: 'HKD',
    market: 'HK Stocks',
    score: 72,
    status: 'Buy',
    lastAnalysis: '分析师普遍看好美团中期增长，目标价远超现价。',
    lastUpdated: Date.now()
  },
  {
    id: 'w9_zijin',
    symbol: '601899.SS', // Corrected from '紫金矿业' to Ticker
    name: '紫金矿业',
    assetClass: AssetClass.PRECIOUS_METALS,
    currentPrice: 28.44,
    currency: 'CNY',
    market: 'A-Shares',
    score: 88,
    status: 'Buy',
    lastAnalysis: '盈利强劲，铜金前景乐观，机构评级一致看好。',
    lastUpdated: Date.now()
  },
  {
    id: 'w10_etf1',
    symbol: '159265.SZ',
    name: '港股消费50ETF',
    assetClass: AssetClass.A_SHARES,
    currentPrice: 0.996,
    currency: 'CNY',
    market: 'A-Shares',
    score: 35,
    status: 'Watch',
    lastAnalysis: '近期表现疲软，股价低于中期均线，中期趋势不明朗。',
    lastUpdated: Date.now()
  },
  {
    id: 'w11_etf2',
    symbol: '517900.SS',
    name: '银行AH优选ETF',
    assetClass: AssetClass.A_SHARES,
    currentPrice: 1.524,
    currency: 'CNY',
    market: 'A-Shares',
    score: 70,
    status: 'Buy',
    lastAnalysis: '资金流入强劲，估值具吸引力，技术指标积极。',
    lastUpdated: Date.now()
  },
  {
    id: 'w12_qqq',
    symbol: 'QQQ',
    name: '纳指100ETF',
    assetClass: AssetClass.HK_STOCKS, // Using HK bucket for US/Global
    currentPrice: 590.07,
    currency: 'USD',
    market: 'US Stocks',
    score: 75,
    status: 'Watch',
    lastAnalysis: '分析师看涨，目标价超20%潜在涨幅。短期技术面弱。',
    lastUpdated: Date.now()
  },
  {
    id: 'w13_spx',
    symbol: 'SPX',
    name: '标普500指数',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 6538.76,
    currency: 'USD',
    market: 'US Stocks',
    score: 35,
    status: 'Watch',
    lastAnalysis: 'SPX技术面偏空，跌破关键支撑，短期回调风险高。',
    lastUpdated: Date.now()
  },
  {
    id: 'w14_semi',
    symbol: '159516.SZ',
    name: '半导体设备ETF',
    assetClass: AssetClass.A_SHARES,
    currentPrice: 1.387,
    currency: 'CNY',
    market: 'A-Shares',
    score: 75,
    status: 'Buy',
    lastAnalysis: '受AI和国产替代驱动，增长前景强劲，ETF规模快速增长。',
    lastUpdated: Date.now()
  },
  {
    id: 'w15_kuaishou',
    symbol: '01024.HK',
    name: '快手-W',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 68.55,
    currency: 'HKD',
    market: 'HK Stocks',
    score: 88,
    status: 'Buy',
    lastAnalysis: '快手基本面强劲，AI驱动增长，股价有20%以上上涨潜力。',
    lastUpdated: Date.now()
  }
];

export const MOCK_PERFORMANCE_DATA = [
  { month: 'Jan', value: 10000000, target: 10000000 },
  { month: 'Feb', value: 10050000, target: 10160000 },
  { month: 'Mar', value: 9980000, target: 10330000 },
  { month: 'Apr', value: 10200000, target: 10500000 },
  { month: 'May', value: 10350000, target: 10670000 },
  { month: 'Jun', value: 10400000, target: 10850000 },
  { month: 'Jul', value: 10600000, target: 11030000 },
];
