import React from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

export default function MarketCircuitBackground({ isDark }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}
      aria-hidden="true"
    >
      {/* Ambient Gradient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.20) 0%, rgba(5, 150, 105, 0.06) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.04) 50%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulseGlow 6s ease-in-out infinite alternate'
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.05) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(220, 38, 38, 0.11) 0%, rgba(239, 68, 68, 0.03) 50%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulseGlow 6s ease-in-out infinite alternate-reverse'
        }}
      />

      {/* Financial Coordinate Grid & Candlestick Circuit SVG */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          width: '100%',
          height: '100%',
          opacity: isDark ? 0.9 : 0.75
        }}
      >
        <defs>
          {/* Upper Circuit Area Gradient */}
          <linearGradient id="ucGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity={isDark ? "0.25" : "0.16"} />
            <stop offset="60%" stopColor="#059669" stopOpacity={isDark ? "0.08" : "0.04"} />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </linearGradient>

          {/* Lower Circuit Area Gradient */}
          <linearGradient id="lcGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={isDark ? "0.20" : "0.12"} />
            <stop offset="60%" stopColor="#DC2626" stopOpacity={isDark ? "0.06" : "0.02"} />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter for circuit lines */}
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="marketGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke={isDark ? "rgba(20, 184, 166, 0.08)" : "rgba(4, 47, 46, 0.06)"}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* Background Grid Pattern */}
        <rect width="100%" height="100%" fill="url(#marketGrid)" />

        {/* ========================================================= */}
        {/* 1. UPPER CIRCUIT BAND (+20.00%) */}
        {/* ========================================================= */}
        {/* Upper Circuit Ceiling Zone Background */}
        <rect x="0" y="80" width="1440" height="40" fill={isDark ? "rgba(16, 185, 129, 0.05)" : "rgba(5, 150, 105, 0.035)"} />

        {/* Upper Circuit Line (Dashed Glowing Green) */}
        <line
          x1="0"
          y1="100"
          x2="1440"
          y2="100"
          stroke="#10B981"
          strokeWidth="2.2"
          strokeDasharray="8 5"
          filter="url(#glowGreen)"
        />

        {/* Resistance Level (+10.00%) */}
        <line
          x1="0"
          y1="250"
          x2="1440"
          y2="250"
          stroke={isDark ? "rgba(16, 185, 129, 0.22)" : "rgba(5, 150, 105, 0.16)"}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Baseline / Equilibrium (Prev Close / CMP 0.00%) */}
        <line
          x1="0"
          y1="450"
          x2="1440"
          y2="450"
          stroke={isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(71, 85, 105, 0.20)"}
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />

        {/* Support Level (-10.00%) */}
        <line
          x1="0"
          y1="650"
          x2="1440"
          y2="650"
          stroke={isDark ? "rgba(239, 68, 68, 0.22)" : "rgba(220, 38, 38, 0.16)"}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* ========================================================= */}
        {/* 2. LOWER CIRCUIT BAND (-20.00%) */}
        {/* ========================================================= */}
        {/* Lower Circuit Floor Zone Background */}
        <rect x="0" y="780" width="1440" height="40" fill={isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(220, 38, 38, 0.035)"} />

        {/* Lower Circuit Line (Dashed Glowing Red) */}
        <line
          x1="0"
          y1="800"
          x2="1440"
          y2="800"
          stroke="#EF4444"
          strokeWidth="2.2"
          strokeDasharray="8 5"
          filter="url(#glowRed)"
        />

        {/* ========================================================= */}
        {/* 3. CHART WAVES: UPPER CIRCUIT SURGE & LOWER CIRCUIT BOUNCE */}
        {/* ========================================================= */}
        {/* Upper Circuit Wave Area Fill */}
        <path
          d="M 0 480 C 140 450, 240 420, 340 330 C 440 240, 520 200, 620 150 C 720 100, 800 100, 950 100 L 1440 100 L 1440 450 L 0 450 Z"
          fill="url(#ucGrad)"
        />

        {/* Upper Circuit Trajectory Line (Surging into UC lock) */}
        <path
          d="M 0 480 C 140 450, 240 420, 340 330 C 440 240, 520 200, 620 150 C 720 100, 800 100, 950 100 L 1440 100"
          fill="none"
          stroke="#10B981"
          strokeWidth="3.2"
          filter="url(#glowGreen)"
        />

        {/* Lower Circuit Dip Area Fill */}
        <path
          d="M 0 450 L 1440 450 L 1440 800 L 1200 800 C 1100 800, 1020 780, 940 720 C 860 660, 780 620, 680 580 C 580 540, 480 520, 380 560 C 280 600, 180 720, 100 780 C 60 800, 20 800, 0 800 Z"
          fill="url(#lcGrad)"
          opacity="0.65"
        />

        {/* Lower Circuit Boundary Wave (Testing & Bouncing off floor) */}
        <path
          d="M 0 800 C 50 800, 100 770, 180 700 C 280 600, 380 560, 480 520 C 580 540, 680 580, 780 620 C 860 660, 940 720, 1020 780 C 1100 800, 1200 800, 1440 800"
          fill="none"
          stroke="#EF4444"
          strokeWidth="2.2"
          strokeDasharray="6 3"
          filter="url(#glowRed)"
          opacity="0.85"
        />

        {/* ========================================================= */}
        {/* 4. STOCK MARKET CANDLESTICKS (Bullish green & Bearish red) */}
        {/* ========================================================= */}
        {/* Bullish Candlestick Series (Upper Circuit Surge) */}
        <g strokeWidth="1.2">
          {/* Candle 1 */}
          <line x1="80" y1="440" x2="80" y2="495" stroke="#10B981" />
          <rect x="74" y="452" width="12" height="32" fill="#10B981" rx="2" />

          {/* Candle 2 */}
          <line x1="150" y1="410" x2="150" y2="475" stroke="#10B981" />
          <rect x="144" y="420" width="12" height="42" fill="#10B981" rx="2" />

          {/* Candle 3 (Pullback) */}
          <line x1="220" y1="390" x2="220" y2="445" stroke="#EF4444" />
          <rect x="214" y="405" width="12" height="28" fill="#EF4444" rx="2" />

          {/* Candle 4 (Breakout) */}
          <line x1="290" y1="310" x2="290" y2="380" stroke="#10B981" />
          <rect x="284" y="325" width="12" height="45" fill="#10B981" rx="2" />

          {/* Candle 5 (Strong Surge) */}
          <line x1="360" y1="230" x2="360" y2="310" stroke="#10B981" />
          <rect x="354" y="245" width="12" height="52" fill="#10B981" rx="2" />

          {/* Candle 6 */}
          <line x1="430" y1="180" x2="430" y2="255" stroke="#10B981" />
          <rect x="424" y="195" width="12" height="48" fill="#10B981" rx="2" />

          {/* Candle 7 (Approaching UC) */}
          <line x1="510" y1="130" x2="510" y2="200" stroke="#10B981" />
          <rect x="504" y="142" width="12" height="45" fill="#10B981" rx="2" />

          {/* Candle 8 (UC Limit Hit) */}
          <line x1="590" y1="100" x2="590" y2="155" stroke="#10B981" />
          <rect x="584" y="100" width="12" height="40" fill="#10B981" rx="2" />

          {/* Candle 9 (Locked at UC - Flat bar / Buyers only) */}
          <line x1="680" y1="100" x2="680" y2="115" stroke="#10B981" />
          <rect x="674" y="100" width="12" height="8" fill="#10B981" rx="1" />

          <line x1="770" y1="100" x2="770" y2="108" stroke="#10B981" />
          <rect x="764" y="100" width="12" height="5" fill="#10B981" rx="1" />

          <line x1="860" y1="100" x2="860" y2="108" stroke="#10B981" />
          <rect x="854" y="100" width="12" height="5" fill="#10B981" rx="1" />

          <line x1="950" y1="100" x2="950" y2="105" stroke="#10B981" />
          <rect x="944" y="100" width="12" height="4" fill="#10B981" rx="1" />

          <line x1="1040" y1="100" x2="1040" y2="105" stroke="#10B981" />
          <rect x="1034" y="100" width="12" height="4" fill="#10B981" rx="1" />

          <line x1="1130" y1="100" x2="1130" y2="105" stroke="#10B981" />
          <rect x="1124" y="100" width="12" height="4" fill="#10B981" rx="1" />

          <line x1="1220" y1="100" x2="1220" y2="105" stroke="#10B981" />
          <rect x="1214" y="100" width="12" height="4" fill="#10B981" rx="1" />

          <line x1="1310" y1="100" x2="1310" y2="105" stroke="#10B981" />
          <rect x="1304" y="100" width="12" height="4" fill="#10B981" rx="1" />

          <line x1="1390" y1="100" x2="1390" y2="105" stroke="#10B981" />
          <rect x="1384" y="100" width="12" height="4" fill="#10B981" rx="1" />
        </g>

        {/* Bearish Candlesticks Series (Near Lower Circuit) */}
        <g strokeWidth="1.2">
          <line x1="120" y1="740" x2="120" y2="800" stroke="#EF4444" />
          <rect x="114" y="750" width="12" height="40" fill="#EF4444" rx="2" />

          <line x1="190" y1="670" x2="190" y2="735" stroke="#EF4444" />
          <rect x="184" y="685" width="12" height="36" fill="#EF4444" rx="2" />

          <line x1="260" y1="590" x2="260" y2="655" stroke="#10B981" />
          <rect x="254" y="605" width="12" height="35" fill="#10B981" rx="2" />

          <line x1="1250" y1="750" x2="1250" y2="800" stroke="#EF4444" />
          <rect x="1244" y="760" width="12" height="35" fill="#EF4444" rx="2" />

          <line x1="1340" y1="770" x2="1340" y2="800" stroke="#EF4444" />
          <rect x="1334" y="780" width="12" height="18" fill="#EF4444" rx="2" />
        </g>

        {/* Volume Bars at the Bottom */}
        <g opacity={isDark ? "0.40" : "0.25"}>
          <rect x="74" y="850" width="12" height="30" fill="#10B981" rx="1" />
          <rect x="144" y="840" width="12" height="40" fill="#10B981" rx="1" />
          <rect x="214" y="860" width="12" height="20" fill="#EF4444" rx="1" />
          <rect x="284" y="830" width="12" height="50" fill="#10B981" rx="1" />
          <rect x="354" y="810" width="12" height="70" fill="#10B981" rx="1" />
          <rect x="424" y="800" width="12" height="80" fill="#10B981" rx="1" />
          <rect x="504" y="780" width="12" height="100" fill="#10B981" rx="1" />
          <rect x="584" y="770" width="12" height="110" fill="#10B981" rx="1" />
          <rect x="674" y="820" width="12" height="60" fill="#10B981" rx="1" />
          <rect x="764" y="830" width="12" height="50" fill="#10B981" rx="1" />
          <rect x="854" y="840" width="12" height="40" fill="#10B981" rx="1" />
          <rect x="944" y="845" width="12" height="35" fill="#10B981" rx="1" />
          <rect x="1034" y="850" width="12" height="30" fill="#10B981" rx="1" />
          <rect x="1124" y="855" width="12" height="25" fill="#10B981" rx="1" />
          <rect x="1214" y="850" width="12" height="30" fill="#10B981" rx="1" />
          <rect x="1304" y="855" width="12" height="25" fill="#10B981" rx="1" />
          <rect x="1384" y="850" width="12" height="30" fill="#10B981" rx="1" />
        </g>
      </svg>

      {/* ========================================================= */}
      {/* 5. FLOATING MARKET CIRCUIT BADGES & METRICS */}
      {/* ========================================================= */}

      {/* UPPER CIRCUIT BADGE - Top Left */}
      <div
        className="market-badge market-badge-top-left"
        style={{
          position: 'absolute',
          top: '28px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: isDark ? 'rgba(6, 78, 59, 0.85)' : 'rgba(236, 253, 245, 0.94)',
          border: '1.5px solid #059669',
          padding: '8px 16px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.22)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}
        >
          <TrendingUp size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: isDark ? '#34D399' : '#047857', textTransform: 'uppercase' }}>
              Upper Circuit (UC)
            </span>
            <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#059669', color: '#FFF', padding: '1px 6px', borderRadius: '4px' }}>
              +20.00%
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: isDark ? '#E6FFFA' : '#064E3B', fontFamily: 'var(--font-number)' }}>
            ₹1,480.00 <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#A7F3D0' : '#059669' }}>(LIMIT HIT 🔒)</span>
          </div>
        </div>
      </div>

      {/* UPPER CIRCUIT BADGE - Top Right (Buyers Only / Demand indicator) */}
      <div
        className="market-badge market-badge-top-right"
        style={{
          position: 'absolute',
          top: '28px',
          right: '80px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isDark ? 'rgba(4, 43, 40, 0.88)' : 'rgba(255, 255, 255, 0.94)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '8px 16px',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(4, 47, 46, 0.08)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981', animation: 'blink 1.4s infinite' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#34D399' : '#047857' }}>
          NSE/BSE: 100% BUYERS • 0 SELLERS
        </span>
      </div>

      {/* LOWER CIRCUIT BADGE - Bottom Left */}
      <div
        className="market-badge market-badge-bottom-left"
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: isDark ? 'rgba(76, 5, 25, 0.75)' : 'rgba(254, 242, 242, 0.94)',
          border: '1.5px solid #DC2626',
          padding: '8px 16px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.18)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}
        >
          <TrendingDown size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: isDark ? '#F87171' : '#B91C1C', textTransform: 'uppercase' }}>
              Lower Circuit (LC)
            </span>
            <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#DC2626', color: '#FFF', padding: '1px 6px', borderRadius: '4px' }}>
              -20.00%
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: isDark ? '#FFE4E6' : '#7F1D1D', fontFamily: 'var(--font-number)' }}>
            ₹986.00 <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#FECDD3' : '#DC2626' }}>(SUPPORT FLOOR)</span>
          </div>
        </div>
      </div>

      {/* MARKET TELEMETRY - Bottom Right */}
      <div
        className="market-badge market-badge-bottom-right"
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: isDark ? 'rgba(4, 43, 40, 0.88)' : 'rgba(255, 255, 255, 0.94)',
          border: '1px solid var(--panel-border)',
          padding: '8px 16px',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(4, 47, 46, 0.08)',
          backdropFilter: 'blur(12px)',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <Activity size={14} color="var(--brand-accent)" /> IPO Index: <strong style={{ color: 'var(--text-main)' }}>32,480.50</strong>
        </span>
        <span style={{ color: 'var(--panel-border)' }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <Zap size={14} color="#10B981" /> Market Depth: <strong style={{ color: '#10B981' }}>High Surge</strong>
        </span>
      </div>

      {/* Animation keyframes & responsive queries */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1) translateY(0); opacity: 0.8; }
          100% { transform: scale(1.15) translateY(-20px); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 1024px) {
          .market-badge-top-right, .market-badge-bottom-right {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .market-badge {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
