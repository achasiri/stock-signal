import { useState, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `You are a sharp, data-driven stock analyst specializing in low-to-moderate risk investing.
Your job: analyze trending stocks using recent news and market trends, then recommend exactly:
- TOP 3 STOCKS TO BUY (low-moderate risk, strong fundamentals, positive momentum)
- TOP 3 STOCKS TO AVOID (high risk, negative signals, overvalued, or unstable)

Always respond in this EXACT JSON format (no markdown, no extra text):
{
  "analysis_date": "today's date",
  "market_sentiment": "Bullish | Neutral | Bearish",
  "sentiment_reason": "one sentence why",
  "buy": [
    {
      "ticker": "AAPL",
      "company": "Apple Inc.",
      "sector": "Technology",
      "price_range": "$170-180",
      "risk_level": "Low",
      "confidence": 87,
      "thesis": "2-3 sentence investment thesis based on recent news/trends",
      "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
      "signal": "Strong Buy | Buy | Moderate Buy"
    }
  ],
  "avoid": [
    {
      "ticker": "XYZ",
      "company": "Company Name",
      "sector": "Sector",
      "risk_level": "High",
      "confidence": 80,
      "thesis": "2-3 sentence reason to avoid based on recent signals",
      "red_flags": ["flag 1", "flag 2", "flag 3"],
      "signal": "Avoid | Strong Avoid | Wait"
    }
  ],
  "disclaimer": "brief risk disclaimer"
}

Base your picks on: current news sentiment, recent earnings signals, sector momentum, macro conditions, and technical momentum. Be specific and cite real companies and tickers.`;

const fetchStockAnalysis = async () => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Today is ${today}. Search for the latest trending stocks, market news, earnings reports, and economic signals from the past 24-48 hours. Then give me your top 3 stocks to buy and top 3 to avoid for a low-to-moderate risk investor. Search for: "trending stocks today", "stock market news today", "best stocks to buy now", "stocks to avoid today". Return ONLY valid JSON.`,
      }],
    }),
  });

  const data = await response.json();
  const fullText = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
};

const RiskBadge = ({ level }) => {
  const colors = {
    Low: "background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)",
    "Low-Moderate": "background:rgba(20,184,166,0.15);color:#2dd4bf;border:1px solid rgba(20,184,166,0.3)",
    Moderate: "background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)",
    High: "background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)",
  };
  const style = colors[level] || colors["Moderate"];
  return (
    <span style={{
      fontSize: "0.7rem", padding: "2px 8px", borderRadius: "9999px",
      fontWeight: 600, ...Object.fromEntries(style.split(";").filter(Boolean).map(s => {
        const [k, ...v] = s.split(":");
        return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(":").trim()];
      }))
    }}>
      {level} Risk
    </span>
  );
};

const ConfidenceBar = ({ value, color }) => (
  <div style={{ width: "100%" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "4px", color: "#64748b" }}>
      <span>Confidence</span>
      <span style={{ color: color || "#34d399", fontWeight: 700 }}>{value}%</span>
    </div>
    <div style={{ height: "6px", borderRadius: "9999px", background: "rgba(255,255,255,0.07)" }}>
      <div style={{
        height: "100%", borderRadius: "9999px",
        width: `${value}%`,
        background: `linear-gradient(90deg, ${color || "#34d399"}, ${color === "#f87171" ? "#ef4444" : "#10b981"})`,
        transition: "width 1s ease",
      }} />
    </div>
  </div>
);

const SentimentDot = ({ sentiment }) => {
  const map = {
    Bullish: { color: "#34d399", label: "▲ Bullish" },
    Neutral: { color: "#f59e0b", label: "● Neutral" },
    Bearish: { color: "#f87171", label: "▼ Bearish" },
  };
  const s = map[sentiment] || map["Neutral"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: s.color }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", animation: "pulse 2s infinite" }} />
      {s.label}
    </span>
  );
};

const StockCard = ({ stock, type }) => {
  const isBuy = type === "buy";
  const accent = isBuy ? "#34d399" : "#f87171";
  const items = isBuy ? stock.catalysts : stock.red_flags;

  return (
    <div style={{
      borderRadius: "16px", padding: "20px",
      background: `linear-gradient(135deg, ${isBuy ? "rgba(52,211,153,0.05)" : "rgba(248,113,113,0.05)"}, rgba(15,23,42,0.8))`,
      border: `1px solid ${isBuy ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`,
      backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: accent, fontFamily: "'Space Mono', monospace", letterSpacing: "0.04em" }}>
              {stock.ticker}
            </span>
            <RiskBadge level={stock.risk_level} />
          </div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#cbd5e1" }}>{stock.company}</div>
          <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>{stock.sector}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: "8px",
            background: `${accent}1A`, color: accent, border: `1px solid ${accent}44`,
            whiteSpace: "nowrap",
          }}>
            {stock.signal}
          </div>
          {stock.price_range && (
            <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "6px" }}>{stock.price_range}</div>
          )}
        </div>
      </div>

      <ConfidenceBar value={stock.confidence} color={accent} />

      <p style={{ fontSize: "0.85rem", lineHeight: 1.65, color: "#94a3b8" }}>{stock.thesis}</p>

      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#334155", marginBottom: "8px" }}>
          {isBuy ? "Catalysts" : "Red Flags"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {(items || []).map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
              <span style={{ color: accent, marginTop: "1px", flexShrink: 0 }}>{isBuy ? "↗" : "⚠"}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LoadingPulse = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "80px 0" }}>
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "2px solid transparent", borderTopColor: "#34d399",
        animation: "spin 1s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: 8, borderRadius: "50%",
        border: "2px solid transparent", borderTopColor: "#3b82f6",
        animation: "spin 1.5s linear infinite reverse",
      }} />
      <div style={{
        position: "absolute", inset: 16, borderRadius: "50%",
        background: "rgba(52,211,153,0.12)",
      }} />
    </div>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#94a3b8", marginBottom: "4px" }}>
        Scanning markets & live news...
      </div>
      <div style={{ fontSize: "0.75rem", color: "#334155" }}>
        Searching data · Analyzing signals · Building recommendations
      </div>
    </div>
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
      {["Trending stocks", "Earnings signals", "News sentiment", "Risk analysis"].map((step, i) => (
        <div key={step} style={{
          fontSize: "0.72rem", padding: "4px 10px", borderRadius: "9999px",
          background: "rgba(52,211,153,0.08)", color: "#34d399",
          animation: `pulse 2s ease ${i * 0.3}s infinite`,
        }}>
          {step}
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("buy");

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStockAnalysis();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runAnalysis(); }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0a0f1e 45%, #020617 100%)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 24px 24px", maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#34d399" }}>
                Live AI Analysis
              </span>
            </div>
            <h1 style={{
              fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em",
              color: "#f1f5f9", fontFamily: "'Space Mono', monospace", margin: 0,
            }}>
              STOCK<span style={{ color: "#34d399" }}>·</span>SIGNAL
            </h1>
            <p style={{ fontSize: "0.8rem", color: "#334155", marginTop: "4px" }}>
              AI-powered daily picks · Low–Moderate risk
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.8rem", fontWeight: 700, padding: "8px 16px", borderRadius: "12px",
              background: "rgba(52,211,153,0.12)", color: "#34d399",
              border: "1px solid rgba(52,211,153,0.3)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, transition: "all 0.2s",
            }}
          >
            <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none" }}>⟳</span>
            {loading ? "Scanning..." : "Refresh"}
          </button>
        </div>

        {lastUpdated && !loading && (
          <div style={{ fontSize: "0.72rem", color: "#1e293b", marginTop: "12px" }}>
            Last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{ padding: "0 24px 64px", maxWidth: "680px", margin: "0 auto" }}>

        {/* Market Sentiment Banner */}
        {data && !loading && (
          <div style={{
            borderRadius: "16px", padding: "16px 20px", marginBottom: "24px",
            background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#334155" }}>
                Market Sentiment
              </span>
              <SentimentDot sentiment={data.market_sentiment} />
            </div>
            <p style={{ fontSize: "0.82rem", color: "#475569", margin: 0 }}>{data.sentiment_reason}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingPulse />}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            borderRadius: "16px", padding: "24px", textAlign: "center",
            background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)",
          }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#f87171", marginBottom: "4px" }}>
              Analysis Failed
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "16px" }}>{error}</div>
            <button
              onClick={runAnalysis}
              style={{
                fontSize: "0.78rem", padding: "8px 20px", borderRadius: "10px", fontWeight: 700,
                background: "rgba(248,113,113,0.15)", color: "#f87171",
                border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Tabs & Cards */}
        {data && !loading && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: "buy", label: "✦ Buy", color: "#34d399", count: data.buy?.length },
                { id: "avoid", label: "✕ Avoid", color: "#f87171", count: data.avoid?.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "12px",
                    fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                    background: activeTab === tab.id ? `${tab.color}18` : "rgba(15,23,42,0.5)",
                    color: activeTab === tab.id ? tab.color : "#334155",
                    border: `1px solid ${activeTab === tab.id ? `${tab.color}44` : "rgba(255,255,255,0.05)"}`,
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label} · {tab.count}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {(activeTab === "buy" ? data.buy : data.avoid)?.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} type={activeTab} />
              ))}
            </div>

            {data.disclaimer && (
              <div style={{
                marginTop: "32px", borderRadius: "12px", padding: "12px 16px",
                fontSize: "0.72rem", textAlign: "center", color: "#1e293b",
                background: "rgba(15,23,42,0.4)", border: "1px solid rgba(255,255,255,0.03)",
              }}>
                ⚠ {data.disclaimer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
