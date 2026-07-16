import { useMemo } from 'react';
import type { AuctionListing } from '../types';
import { formatStroops } from '../services/soroban';
import { generateBidChartData, calcBidMetrics } from '../utils/bidChartData';

interface BidPriceChartProps {
  auction: AuctionListing;
}

const WIDTH = 320;
const HEIGHT = 100;
const PAD_X = 12;
const PAD_Y = 10;

export function BidPriceChart({ auction }: BidPriceChartProps) {
  const points = useMemo(() => generateBidChartData(auction), [auction]);
  const { premiumPct, progressPct, hasBids } = useMemo(() => calcBidMetrics(auction), [auction]);

  // Map data to SVG coordinates
  const amounts = points.map((p) => BigInt(p.amountStroops));
  const minAmt = amounts.reduce((a, b) => (b < a ? b : a), amounts[0]);
  const maxAmt = amounts.reduce((a, b) => (b > a ? b : a), amounts[0]);
  const range = maxAmt - minAmt;

  const chartW = WIDTH - PAD_X * 2;
  const chartH = HEIGHT - PAD_Y * 2;

  const svgPoints = points.map((p, i) => {
    const x = PAD_X + (i / (points.length - 1)) * chartW;
    const y =
      range === 0n
        ? PAD_Y + chartH / 2
        : PAD_Y + chartH - (Number(BigInt(p.amountStroops) - minAmt) / Number(range)) * chartH;
    return { x, y, ...p };
  });

  const polyline = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Fill area under the curve
  const areaPath = `M ${svgPoints[0].x},${PAD_Y + chartH} ` +
    svgPoints.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${svgPoints[svgPoints.length - 1].x},${PAD_Y + chartH} Z`;

  const lastPoint = svgPoints[svgPoints.length - 1];
  const isSettled = auction.status === 'settled';
  // Use success-green for settled, auction-live for active, or outline for upcoming/preview
  const lineColor = isSettled ? '#2E7D32' : '#E91E63'; 
  const gradId = `bid-grad-${auction.id}`;

  return (
    <div className="bg-surface-container rounded-b-xl border-t border-outline-variant p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
          Bid History Analytics
        </span>
        <div className="flex items-center gap-2">
          {hasBids && (
            <span className={`text-label-sm font-semibold px-2 py-0.5 rounded-full ${
              premiumPct > 0
                ? 'bg-success-green/10 text-success-green'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              +{premiumPct}% vs start
            </span>
          )}
          {!hasBids && (
            <span className="text-label-sm font-semibold text-outline">No bids yet</span>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: HEIGHT }}
        aria-label="Bid price history chart"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={PAD_X}
            y1={PAD_Y + chartH * frac}
            x2={WIDTH - PAD_X}
            y2={PAD_Y + chartH * frac}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
            className="text-outline"
          />
        ))}

        {/* Filled area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Main line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {svgPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === svgPoints.length - 1 ? 3.5 : 2}
            fill={i === svgPoints.length - 1 ? lineColor : 'white'}
            stroke={lineColor}
            strokeWidth={i === svgPoints.length - 1 ? 1.5 : 1}
          />
        ))}

        {/* Label for current high */}
        <text
          x={Math.min(lastPoint.x + 6, WIDTH - PAD_X - 4)}
          y={lastPoint.y - 6}
          fontSize="9"
          fill={lineColor}
          fontWeight="700"
          textAnchor={lastPoint.x > WIDTH * 0.6 ? 'end' : 'start'}
        >
          {formatStroops(lastPoint.amountStroops)} XLM
        </text>
      </svg>

      {/* Metrics row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-container-low px-2 py-1.5 border border-outline-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Start</p>
          <p className="text-label-sm font-bold text-primary mt-0.5">
            {formatStroops(auction.startingBid)} XLM
          </p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-2 py-1.5 border border-outline-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Current</p>
          <p className="text-label-sm font-bold text-primary mt-0.5">
            {hasBids ? `${formatStroops(auction.highestBid)} XLM` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-2 py-1.5 border border-outline-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Progress</p>
          <p className="text-label-sm font-bold text-primary mt-0.5">{progressPct}%</p>
        </div>
      </div>

      {/* Auction progress bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isSettled
                ? 'bg-success-green'
                : progressPct > 75
                ? 'bg-secondary-container'
                : 'bg-auction-live'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-on-surface-variant font-semibold text-right">
          {isSettled ? 'Auction complete' : `${100 - progressPct}% duration left`}
        </p>
      </div>
    </div>
  );
}
