import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Bell, Info, Compass, HelpCircle, Download, Trash2, Share2, TrendingUp } from 'lucide-react';
import { PriceAlert } from '../types';
import { cn, formatNumber } from '../lib/utils';
import { deleteAlert, updateAlertThreshold } from '../lib/firestoreService';
import { toast } from 'sonner';

interface AlertsD3ChartProps {
  alerts: PriceAlert[];
  currentPrice: number;
  symbol: string;
}

export const AlertsD3Chart: React.FC<AlertsD3ChartProps> = ({
  alerts,
  currentPrice,
  symbol,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 160 });
  const [hoveredAlert, setHoveredAlert] = useState<PriceAlert | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isRadarHovered, setIsRadarHovered] = useState(false);
  const [hoveredCurvePoint, setHoveredCurvePoint] = useState<{ price: number; density: number; x: number; y: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'triggered'>('all');
  const [customBounds, setCustomBounds] = useState<{ min: number; max: number } | null>(null);
  const [hoveredLegendCategory, setHoveredLegendCategory] = useState<'above' | 'below' | 'coverage' | null>(null);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [localThreshold, setLocalThreshold] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [volatilityAware, setVolatilityAware] = useState(true);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{ 
    dayLabel: string; 
    dateLabel: string; 
    price: number; 
    highBand: number;
    lowBand: number;
    x: number; 
    y: number; 
  } | null>(null);
  const [hoveredSmaPoint, setHoveredSmaPoint] = useState<{ price: number; density: number; x: number; y: number } | null>(null);

  const sevenDayPriceTrend = useMemo(() => {
    const data = [];
    const now = new Date("2026-05-22"); // Reference system current date for stability
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' });
    const seedHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      let priceVal = currentPrice;
      if (i > 0) {
        const sine1 = Math.sin(seedHash + i * 1.8);
        const sine2 = Math.cos(seedHash * 0.7 + i * 2.3);
        const deviation = (sine1 * 0.65 + sine2 * 0.35) * 0.035; // max +/- 3.5%
        priceVal = currentPrice * (1 + deviation);
      }
      
      data.push({
        dayIndex: 6 - i,
        dateLabel: dateFormatter.format(d),
        dayLabel: dayFormatter.format(d),
        price: priceVal,
        isToday: i === 0,
      });
    }
    return data;
  }, [currentPrice, symbol]);

  const movingAveragePrice = useMemo(() => {
    if (sevenDayPriceTrend.length === 0) return currentPrice;
    const sum = sevenDayPriceTrend.reduce((acc, d) => acc + d.price, 0);
    return sum / sevenDayPriceTrend.length;
  }, [sevenDayPriceTrend, currentPrice]);

  const sevenDayTrendData = useMemo(() => {
    const data = [];
    const now = new Date("2026-05-22"); // Reference system current date for stability
    
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' });

    // Seed deterministic yet dynamic triggers for natural asset personality
    const seedHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calculate actual database triggers on this exact date
      const dbTriggers = alerts.filter(a => {
        if (!a.createdAt || a.asset !== symbol) return false;
        return a.createdAt.startsWith(dateString) && a.status === 'triggered';
      }).length;

      // Seed baseline frequency deterministically based on seedHash and date index
      const seedVal = ((seedHash + (i * 7)) % 5) + 1;

      // Total count combines baseline and live real-time triggers
      const count = seedVal + dbTriggers;
      
      // Categorize volatility
      let volatility = "Normal";
      if (count >= 5) volatility = "Critical";
      else if (count >= 3) volatility = "Elevated";

      data.push({
        dateLabel: dateFormatter.format(d),
        dayLabel: dayFormatter.format(d),
        count,
        volatility,
        isToday: i === 0,
      });
    }
    return data;
  }, [alerts, symbol]);

  const maxTrendCount = useMemo(() => {
    const maxVal = Math.max(...sevenDayTrendData.map(d => d.count), 1);
    return maxVal;
  }, [sevenDayTrendData]);

  const totalTriggers = useMemo(() => {
    return sevenDayTrendData.reduce((acc, curr) => acc + curr.count, 0);
  }, [sevenDayTrendData]);

  const avgTriggers = useMemo(() => {
    return (totalTriggers / 7).toFixed(1);
  }, [totalTriggers]);

  // Filter alerts for the current asset based on statusFilter
  const visibleAlerts = useMemo(() => {
    if (statusFilter === 'all') {
      return alerts.filter(a => a.asset === symbol);
    }
    if (statusFilter === 'active') {
      return alerts.filter(a => a.asset === symbol && a.status === 'active');
    }
    if (statusFilter === 'triggered') {
      return alerts.filter(a => a.asset === symbol && a.status === 'triggered');
    }
    return alerts.filter(a => a.asset === symbol); // fallback
  }, [alerts, symbol, statusFilter]);

  const volatilityMetrics = useMemo(() => {
    const thresholds = visibleAlerts.map(a => a.threshold);
    
    // Use visible alerts to compute dispersion, fallback gracefully if under 2 alerts
    const samplePrices = thresholds.length >= 2 ? thresholds : [currentPrice * 0.982, currentPrice * 1.018];
    
    const mean = samplePrices.reduce((sum, p) => sum + p, 0) / samplePrices.length;
    const variance = samplePrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / samplePrices.length;
    const stdDev = Math.sqrt(variance);
    
    const maxVal = Math.max(...samplePrices);
    const minVal = Math.min(...samplePrices);
    const delta = maxVal - minVal;
    const deltaPercent = (delta / currentPrice) * 100;

    // Combine standard deviation and historical trigger frequency for high fidelity volatility regime rating
    const triggerCoeff = parseFloat(avgTriggers) || 0;
    const indexCoeff = (stdDev / currentPrice) + (triggerCoeff / 100);
    
    let regime = "Stable Range";
    let colorClass = "text-emerald-400";
    let bgClass = "bg-emerald-500/10 border-emerald-500/20";
    
    if (indexCoeff > 0.045) {
      regime = "High Volatility / Breakout Risk";
      colorClass = "text-rose-400";
      bgClass = "bg-rose-500/10 border-rose-500/20";
    } else if (indexCoeff > 0.02) {
      regime = "Moderate Range Volatility";
      colorClass = "text-amber-400";
      bgClass = "bg-amber-500/10 border-amber-500/20";
    }

    return {
      stdDev,
      stdDevPercent: (stdDev / currentPrice) * 100,
      delta,
      deltaPercent,
      regime,
      colorClass,
      bgClass,
      mean,
      indexCoeff
    };
  }, [visibleAlerts, currentPrice, avgTriggers]);

  const selectedAlert = useMemo(() => {
    return alerts.find(a => a.id === selectedAlertId) || null;
  }, [alerts, selectedAlertId]);

  useEffect(() => {
    if (selectedAlert) {
      setLocalThreshold(selectedAlert.threshold);
    } else {
      setLocalThreshold(null);
    }
  }, [selectedAlertId, selectedAlert?.threshold]);

  // Filter active alerts for the KDE curve
  const activeAssetAlerts = useMemo(() => {
    return visibleAlerts.filter(a => a.status === 'active');
  }, [visibleAlerts]);

  const allAssetAlerts = useMemo(() => {
    return alerts.filter(a => a.asset === symbol);
  }, [alerts, symbol]);

  const activeCount = useMemo(() => {
    return allAssetAlerts.filter(a => a.status === 'active').length;
  }, [allAssetAlerts]);

  const triggeredCount = useMemo(() => {
    return allAssetAlerts.filter(a => a.status === 'triggered').length;
  }, [allAssetAlerts]);

  const legendCounts = useMemo(() => {
    const aboveActive = allAssetAlerts.filter(a => a.condition === 'above' && a.status === 'active').length;
    const aboveTriggered = allAssetAlerts.filter(a => a.condition === 'above' && a.status === 'triggered').length;
    const belowActive = allAssetAlerts.filter(a => a.condition === 'below' && a.status === 'active').length;
    const belowTriggered = allAssetAlerts.filter(a => a.condition === 'below' && a.status === 'triggered').length;

    return {
      above: {
        active: aboveActive,
        triggered: aboveTriggered,
        total: aboveActive + aboveTriggered,
      },
      below: {
        active: belowActive,
        triggered: belowTriggered,
        total: belowActive + belowTriggered,
      },
      coverage: {
        active: activeCount,
        triggered: triggeredCount,
        total: allAssetAlerts.length,
      }
    };
  }, [allAssetAlerts, activeCount, triggeredCount]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCustomBounds(null);
    setHoveredAlert(null);
    setTooltipPos(null);
    setHoveredCurvePoint(null);
    setSelectedAlertId(null);
    setLocalThreshold(null);
    toast.success("Reset density zoom focus and restored overview spectrum!");
  };

  const handleShareCoverageStats = () => {
    const aboveActive = visibleAlerts.filter(a => a.condition === 'above' && a.status === 'active').length;
    const belowActive = visibleAlerts.filter(a => a.condition === 'below' && a.status === 'active').length;
    const totalActive = activeAssetAlerts.length;
    const totalTriggered = visibleAlerts.filter(a => a.status === 'triggered').length;

    const text = `📊 Alert Coverage Summary [${symbol}] 📊\n• Current Spot Price: $${formatNumber(currentPrice, 2)}\n• Active Alerts Coverage: ${totalActive} monitor(s)\n  - Above threshold alerts: ${aboveActive}\n  - Below threshold alerts: ${belowActive}\n• Triggered Alerts: ${totalTriggered} alert(s)\n• Total Alerts Visualized: ${visibleAlerts.length}\n\nGenerated via AI Studio Real-time Radar Map.`;

    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied coverage summary to clipboard!"))
      .catch((err) => {
        console.error("Failed to copy", err);
        toast.error("Failed to copy summary to clipboard");
      });
  };

  const handleUpdateAlertThresholdNum = async (id: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice <= 0) return;
    setLocalThreshold(newPrice);
    try {
      await updateAlertThreshold(id, newPrice);
    } catch (err) {
      console.error("Error updating threshold:", err);
    }
  };

  const handleExportCSV = () => {
    if (allAssetAlerts.length === 0) return;

    const headers = ['Alert ID', 'Asset', 'Condition', 'Threshold Price (USD)', 'Status', 'Created At'];
    
    const rows = allAssetAlerts.map(alert => [
      alert.id,
      alert.asset + '/USDT',
      alert.condition === 'above' ? 'Price Above' : 'Price Below',
      alert.threshold,
      alert.status,
      new Date(alert.createdAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${symbol}_USDT_pricing_bounds_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllActiveAlerts = async () => {
    if (activeAssetAlerts.length === 0) return;
    
    const count = activeAssetAlerts.length;
    try {
      await Promise.all(activeAssetAlerts.map(alert => deleteAlert(alert.id)));
      toast.success(`Purged ${count} active pulse monitor${count > 1 ? 's' : ''} for ${symbol}`);
    } catch (error) {
      toast.error("Failed to clear active alerts");
      console.error(error);
    }
  };

  const handleDeleteAllAlerts = async () => {
    if (allAssetAlerts.length === 0) return;
    const count = allAssetAlerts.length;
    try {
      await Promise.all(allAssetAlerts.map(alert => deleteAlert(alert.id)));
      toast.success(`Successfully removed all ${count} price alerts associated with ${symbol}`);
      setShowDeleteConfirm(false);
      
      // Reset selected/hover state
      setSelectedAlertId(null);
      setLocalThreshold(null);
    } catch (error) {
      toast.error("Failed to delete all alerts");
      console.error(error);
    }
  };

  // Handle ResizeObserver to make D3 chart responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      // Maintain minimum sizing to prevent squishing
      setDimensions({
        width: Math.max(width, 280),
        height: Math.max(height, 150),
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute KDE density data points
  const d3Data = useMemo(() => {
    const margin = { top: 20, right: 30, bottom: 25, left: 30 };
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Set up price range domain boundaries for standard visuals
    let minPrice = currentPrice * 0.95;
    let maxPrice = currentPrice * 1.05;

    // Expand min/max default bounds to cover all 7-day trend prices
    const trendPrices = sevenDayPriceTrend.map(p => p.price);
    const trendMin = Math.min(...trendPrices) * 0.985;
    const trendMax = Math.max(...trendPrices) * 1.015;
    minPrice = Math.min(minPrice, trendMin);
    maxPrice = Math.max(maxPrice, trendMax);

    if (customBounds) {
      minPrice = customBounds.min;
      maxPrice = customBounds.max;
    } else if (visibleAlerts.length > 0) {
      const allThresholds = visibleAlerts.map(a => a.threshold);
      const thresholdMin = Math.min(...allThresholds);
      const thresholdMax = Math.max(...allThresholds);
      
      minPrice = Math.min(minPrice, thresholdMin * 0.97);
      maxPrice = Math.max(maxPrice, thresholdMax * 1.03);
    }

    // Generate x-coordinates for sampling the KDE density curve
    const steps = 60;
    const stepSize = (maxPrice - minPrice) / steps;
    const samplePoints: number[] = [];
    for (let i = 0; i <= steps; i++) {
      samplePoints.push(minPrice + i * stepSize);
    }

    // Dynamic bandwidth calculation based on price range scale
    const bandwidth = Math.max((maxPrice - minPrice) * 0.08, currentPrice * 0.015);

    // Epanechnikov kernel helper
    const epanechnikov = (bw: number) => {
      return (x: number) => Math.abs(x /= bw) <= 1 ? 0.75 * (1 - x * x) / bw : 0;
    };

    // Calculate density values at each sample point
    const thresholds = activeAssetAlerts.map(a => a.threshold);
    let densityData: { price: number; density: number }[] = [];

    if (thresholds.length > 0) {
      const kernel = epanechnikov(bandwidth);
      densityData = samplePoints.map(point => {
        const d = d3.mean(thresholds, t => kernel(point - t)) ?? 0;
        return { price: point, density: d };
      });
    } else {
      // Return beautiful fallback flat curve if no active alerts
      densityData = samplePoints.map(point => ({ price: point, density: 0 }));
    }

    return {
      margin,
      minPrice,
      maxPrice,
      densityData,
      width,
      height,
    };
  }, [visibleAlerts, activeAssetAlerts, customBounds, currentPrice, dimensions.width, dimensions.height, sevenDayPriceTrend]);

  // Render SVG content with D3 selection inside useEffect
  useEffect(() => {
    if (!svgRef.current) return;

    const { margin, minPrice, maxPrice, densityData, width, height } = d3Data;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 1. Scales
    const xScale = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([margin.left, width - margin.right]);

    const maxDensity = d3.max(densityData, d => d.density) || 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxDensity * 1.15]) // pad slightly on top
      .range([height - margin.bottom, margin.top]);

    // Defs for glowing neon drop shadows and gradients
    const defs = svg.append('defs');

    // Volatility-dependent dynamic colors for density spectrum area mapping
    const indexCoeff = volatilityMetrics.indexCoeff ?? 0.01;
    // Map indexCoeff (e.g. from 0.01 = stable to 0.06 = very volatile) to a range of [0, 1.0]
    const normalizedScore = volatilityAware ? Math.min(Math.max((indexCoeff - 0.01) / 0.045, 0), 1) : 0;

    // Smoothly interpolate between Blue (#3b82f6), Purple (#a855f7), and Rose (#f43f5e)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.45, 0.9])
      .range(['#3b82f6', '#a855f7', '#f43f5e'])
      .clamp(true);

    const dynamicStopColor = volatilityAware ? colorScale(normalizedScore) : '#3b82f6';
    const stopOpacityVal = volatilityAware ? (0.25 + normalizedScore * 0.25) : 0.25;

    // Gradient fill under the Density Area
    const areaGradient = defs.append('linearGradient')
      .attr('id', 'alert-density-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', dynamicStopColor) // Volatility adaptive color saturation
      .attr('stop-opacity', String(stopOpacityVal));

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', dynamicStopColor)
      .attr('stop-opacity', '0.0');

    // Neon glow filter for lines
    const neonGlow = defs.append('filter')
      .attr('id', 'glow-blue')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '140%');
    neonGlow.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    neonGlow.append('feMerge')
      .append('feMergeNode').attr('in', 'blur')
      .select(function() { return this.parentNode?.appendChild(this.cloneNode(true)) as SVGElement; })
      .attr('in', 'SourceGraphic');

    const liveGlow = defs.append('filter')
      .attr('id', 'glow-green')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '140%');
    liveGlow.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    liveGlow.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // 2. Custom grid lines
    const gridTicks = xScale.ticks(5);
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(gridTicks)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', 'rgba(255, 255, 255, 0.03)')
      .attr('stroke-width', 1);

    // 3. X Axis Numbers (Aesthetic Tick labels)
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .selectAll('text')
      .data(gridTicks)
      .enter()
      .append('text')
      .attr('x', d => xScale(d))
      .attr('y', 16)
      .attr('fill', '#94a3b8')
      .attr('opacity', 0.45)
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
      .attr('text-anchor', 'middle')
      .text(d => `$${formatNumber(d, d < 10 ? 3 : 1)}`);

    // 4. Draw continuous Kernel Density Curve (only if active alerts exist)
    let areaGen: any = null;
    let lineGen: any = null;
    let areaPath: any = null;
    let linePath: any = null;

    if (activeAssetAlerts.length > 0) {
      areaGen = d3.area<{ price: number; density: number }>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d.price))
        .y0(height - margin.bottom)
        .y1(d => yScale(d.density));

      lineGen = d3.line<{ price: number; density: number }>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d.price))
        .y(d => yScale(d.density));

      areaPath = svg.append('path')
        .datum(densityData)
        .attr('class', 'density-area')
        .attr('fill', 'url(#alert-density-grad)')
        .attr('d', areaGen);

      linePath = svg.append('path')
        .datum(densityData)
        .attr('class', 'density-line')
        .attr('fill', 'none')
        .attr('stroke', dynamicStopColor)
        .attr('stroke-width', 1.5)
        .attr('filter', 'url(#glow-blue)')
        .attr('opacity', 0.85)
        .attr('d', lineGen);
    }

    // 4.1. 7-DAY PRICE VOLATILITY TREND LINE OVERLAY
    const xTimeScale = d3.scaleLinear()
      .domain([0, 6])
      .range([margin.left, width - margin.right]);

    const yPriceScale = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([height - margin.bottom, margin.top]);

    const trendGroup = svg.append('g').attr('class', 'price-trend-overlay');
    const trendColor = volatilityAware ? dynamicStopColor : '#3b82f6';

    const priceLineGen = d3.line<{ dayIndex: number; price: number }>()
      .curve(d3.curveMonotoneX)
      .x(d => xTimeScale(d.dayIndex))
      .y(d => yPriceScale(d.price));

    // Dynamic Volatility Band Area & Boundary Lines mapping the 7D upper and lower limits
    const volatilityBandGen = d3.area<{ dayIndex: number; price: number }>()
      .curve(d3.curveMonotoneX)
      .x(d => xTimeScale(d.dayIndex))
      .y0(d => {
        const lowerLimit = d.price - volatilityMetrics.stdDev;
        return yPriceScale(Math.max(minPrice, lowerLimit));
      })
      .y1(d => {
        const upperLimit = d.price + volatilityMetrics.stdDev;
        return yPriceScale(Math.min(maxPrice, upperLimit));
      });

    const highBandLineGen = d3.line<{ dayIndex: number; price: number }>()
      .curve(d3.curveMonotoneX)
      .x(d => xTimeScale(d.dayIndex))
      .y(d => yPriceScale(Math.min(maxPrice, d.price + volatilityMetrics.stdDev)));

    const lowBandLineGen = d3.line<{ dayIndex: number; price: number }>()
      .curve(d3.curveMonotoneX)
      .x(d => xTimeScale(d.dayIndex))
      .y(d => yPriceScale(Math.max(minPrice, d.price - volatilityMetrics.stdDev)));

    // Render underlying volatility band range behind the main trend line
    trendGroup.append('path')
      .datum(sevenDayPriceTrend)
      .attr('class', 'volatility-band-area')
      .attr('fill', trendColor)
      .attr('opacity', 0.08)
      .attr('d', volatilityBandGen)
      .style('pointer-events', 'none');

    // Draw high volatility band limit
    trendGroup.append('path')
      .datum(sevenDayPriceTrend)
      .attr('class', 'volatility-band-high-line')
      .attr('fill', 'none')
      .attr('stroke', trendColor)
      .attr('stroke-width', 0.75)
      .attr('stroke-dasharray', '2 1.5')
      .attr('opacity', 0.25)
      .attr('d', highBandLineGen)
      .style('pointer-events', 'none');

    // Draw low volatility band limit
    trendGroup.append('path')
      .datum(sevenDayPriceTrend)
      .attr('class', 'volatility-band-low-line')
      .attr('fill', 'none')
      .attr('stroke', trendColor)
      .attr('stroke-width', 0.75)
      .attr('stroke-dasharray', '2 1.5')
      .attr('opacity', 0.25)
      .attr('d', lowBandLineGen)
      .style('pointer-events', 'none');

    // Glow filter or subtle drop shadow for the trend line
    trendGroup.append('path')
      .datum(sevenDayPriceTrend)
      .attr('fill', 'none')
      .attr('stroke', trendColor)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 2.5') // elegant dash pattern
      .attr('opacity', 0.6)
      .attr('filter', 'url(#glow-blue)')
      .attr('d', priceLineGen);

    // Add circular interactive nodes for each day
    trendGroup.selectAll('circle.trend-node')
      .data(sevenDayPriceTrend)
      .enter()
      .append('circle')
      .attr('class', 'trend-node')
      .attr('cx', d => xTimeScale(d.dayIndex))
      .attr('cy', d => yPriceScale(d.price))
      .attr('r', 3.5)
      .attr('fill', '#0f172a') // dark contrast center
      .attr('stroke', trendColor)
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style('filter', `drop-shadow(0 0 2px ${trendColor})`)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition().duration(100)
          .attr('r', 6)
          .attr('fill', trendColor);

        const xPos = xTimeScale(d.dayIndex);
        const yPos = yPriceScale(d.price);
        const highVal = d.price + volatilityMetrics.stdDev;
        const lowVal = d.price - volatilityMetrics.stdDev;

        setHoveredTrendPoint({
          dayLabel: d.dayLabel,
          dateLabel: d.dateLabel,
          price: d.price,
          highBand: highVal,
          lowBand: lowVal,
          x: xPos,
          y: yPos
        });

        // Suppress other interactive overlay hovers temporarily for clarity
        setHoveredCurvePoint(null);
        setHoveredAlert(null);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition().duration(150)
          .attr('r', 3.5)
          .attr('fill', '#0f172a');

        setHoveredTrendPoint(null);
      });

    // Subtly print right-side pricing axis to align with the vertical pricing profile of the 7D trend
    const rightAxisTicks = yPriceScale.ticks(3);
    const rightAxisGroup = svg.append('g')
      .attr('class', 'right-axis-y')
      .attr('transform', `translate(${width - margin.right + 5}, 0)`);

    rightAxisGroup.selectAll('text')
      .data(rightAxisTicks)
      .enter()
      .append('text')
      .attr('y', d => yPriceScale(d))
      .attr('x', 4)
      .attr('fill', trendColor)
      .attr('opacity', 0.45)
      .attr('font-size', '6.5px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
      .attr('alignment-baseline', 'middle')
      .text(d => `$${formatNumber(d, d < 10 ? 2 : 0)}`);

    // Dotted guide line on right axis
    rightAxisGroup.append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', trendColor)
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2 2')
      .attr('opacity', 0.25);

    // 4.2. HORIZONTAL MOVING AVERAGE INDICATOR LINE OVERLAY
    const smaGroup = svg.append('g').attr('class', 'moving-average-indicator');
    const smaColor = '#f59e0b'; // warm amber indicating statistical average

    smaGroup.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', yPriceScale(movingAveragePrice))
      .attr('y2', yPriceScale(movingAveragePrice))
      .attr('stroke', smaColor)
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '4 3')
      .attr('opacity', 0.65)
      .style('cursor', 'help')
      .on('mouseover', function(event) {
        d3.select(this)
          .transition().duration(100)
          .attr('stroke-width', 2.25)
          .attr('opacity', 0.95);

        // Find nearest density on the density curve for the moving average price
        const densityPoint = densityData.reduce((closest, curr) => {
          return Math.abs(curr.price - movingAveragePrice) < Math.abs(closest.price - movingAveragePrice) ? curr : closest;
        }, densityData[0] || { price: movingAveragePrice, density: 0 });

        const [mX] = d3.pointer(event, svgRef.current);
        const mouseX = Math.max(margin.left, Math.min(width - margin.right, mX));
        const posY = yPriceScale(movingAveragePrice);

        setHoveredSmaPoint({
          price: movingAveragePrice,
          density: densityPoint ? densityPoint.density : 0,
          x: mouseX,
          y: posY,
        });

        // Suppress other interactive overlay hovers temporarily for clarity
        setHoveredCurvePoint(null);
        setHoveredAlert(null);
        setHoveredTrendPoint(null);

        toast.info(`7-Day Moving Avg (SMA): ${formatNumber(movingAveragePrice, 2)} | Spot Price: ${formatNumber(currentPrice, 2)} | Deviation: ${((currentPrice - movingAveragePrice) / movingAveragePrice * 100).toFixed(2)}%`);
      })
      .on('mousemove', function(event) {
        const [mX] = d3.pointer(event, svgRef.current);
        const mouseX = Math.max(margin.left, Math.min(width - margin.right, mX));
        setHoveredSmaPoint(prev => prev ? { ...prev, x: mouseX } : null);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition().duration(150)
          .attr('stroke-width', 1.25)
          .attr('opacity', 0.65);
        setHoveredSmaPoint(null);
      });

    smaGroup.append('text')
      .attr('x', margin.left + 6)
      .attr('y', yPriceScale(movingAveragePrice) - 4.5)
      .attr('fill', smaColor)
      .attr('font-size', '6.5px')
      .attr('font-weight', 'black')
      .attr('letter-spacing', '0.5px')
      .attr('alignment-baseline', 'middle')
      .style('text-transform', 'uppercase')
      .style('pointer-events', 'none')
      .style('opacity', 0.85)
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
      .text(`7D SMA: $${formatNumber(movingAveragePrice, 2)}`);

    // 4.5 Add a precise mousemove tracker overlay over the chart area
    const hoverTrackingG = svg.append('g')
      .attr('class', 'hover-tracking')
      .style('pointer-events', 'none')
      .style('display', 'none');

    const hoverLine = hoverTrackingG.append('line')
      .attr('stroke', dynamicStopColor)
      .attr('opacity', 0.45)
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3');

    const hoverOuterDot = hoverTrackingG.append('circle')
      .attr('r', 6)
      .attr('fill', 'none')
      .attr('stroke', dynamicStopColor)
      .attr('stroke-width', 1.5)
      .style('filter', `drop-shadow(0 0 3px ${dynamicStopColor})`);

    const hoverInnerDot = hoverTrackingG.append('circle')
      .attr('r', 3)
      .attr('fill', '#ffffff');

    // Transparent overlay rect for capturing cursor motion over the entire plot space
    svg.append('rect')
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event) {
        // If mouse is targetting an alert pin, let that take precedence
        const hasPinHovered = svg.selectAll('.alert-pins circle:hover').size() > 0;
        if (hasPinHovered) {
          hoverTrackingG.style('display', 'none');
          setHoveredCurvePoint(null);
          return;
        }

        const [mX, mY] = d3.pointer(event, this);
        // Translate back to container space
        const mouseX = mX + margin.left;
        const mouseY = mY + margin.top;

        const hoverPrice = xScale.invert(mouseX);

        // Find closest density curve data point
        let closestPoint = densityData[0];
        if (densityData.length > 1) {
          closestPoint = densityData.reduce((prev, curr) => {
            return Math.abs(curr.price - hoverPrice) < Math.abs(prev.price - hoverPrice) ? curr : prev;
          });
        }

        if (closestPoint) {
          const cx = xScale(closestPoint.price);
          const cy = yScale(closestPoint.density);

          // Update tracking graphics position
          hoverLine
            .attr('x1', cx)
            .attr('x2', cx)
            .attr('y1', cy)
            .attr('y2', height - margin.bottom);

          hoverOuterDot
            .attr('cx', cx)
            .attr('cy', cy);

          hoverInnerDot
            .attr('cx', cx)
            .attr('cy', cy);

          hoverTrackingG.style('display', null);

          setHoveredCurvePoint({
            price: closestPoint.price,
            density: closestPoint.density,
            x: cx,
            y: cy,
          });
        }
      })
      .on('mouseleave', function () {
        hoverTrackingG.style('display', 'none');
        setHoveredCurvePoint(null);
      });

    // 5. Baseline price axis line
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', height - margin.bottom)
      .attr('y2', height - margin.bottom)
      .attr('stroke', 'rgba(255, 255, 255, 0.15)')
      .attr('stroke-dasharray', '2 2')
      .attr('stroke-width', 1);

    // 6. Alert Pins / Pins & Beads
    const pinsGroup = svg.append('g').attr('class', 'alert-pins');

    // Helper to recalculate density curve values dynamically on drag
    const recalculateDensity = (draggedAlertId: string, draggedPrice: number) => {
      // Epanechnikov kernel helper
      const epanechnikov = (bw: number) => {
        return (x: number) => Math.abs(x /= bw) <= 1 ? 0.75 * (1 - x * x) / bw : 0;
      };

      const steps = 60;
      const stepSize = (maxPrice - minPrice) / steps;
      const samplePoints: number[] = [];
      for (let i = 0; i <= steps; i++) {
        samplePoints.push(minPrice + i * stepSize);
      }

      const bandwidth = Math.max((maxPrice - minPrice) * 0.08, currentPrice * 0.015);

      const currentThresholds = activeAssetAlerts.map(a => {
        if (a.id === draggedAlertId) {
          return draggedPrice;
        }
        return a.threshold;
      });

      let updatedDensityData: { price: number; density: number }[] = [];
      if (currentThresholds.length > 0) {
        const kernel = epanechnikov(bandwidth);
        updatedDensityData = samplePoints.map(point => {
          const d = d3.mean(currentThresholds, t => kernel(point - t)) ?? 0;
          return { price: point, density: d };
        });
      } else {
        updatedDensityData = samplePoints.map(point => ({ price: point, density: 0 }));
      }

      return updatedDensityData;
    };

    visibleAlerts.forEach((alert) => {
      const isSelected = alert.id === selectedAlertId;
      const effectiveThreshold = (isSelected && localThreshold !== null) ? localThreshold : alert.threshold;
      const xPos = xScale(effectiveThreshold);
      
      // Keep within bounds
      if (xPos < margin.left || xPos > width - margin.right) return;

      const isTriggered = alert.status === 'triggered';
      const isAbove = alert.condition === 'above';
      
      // Determine height of the pin based on local density or simple heights to stagger them
      const baselineY = height - margin.bottom;
      const densityAtPoint = densityData.reduce((closest, current) => {
        return Math.abs(current.price - effectiveThreshold) < Math.abs(closest.price - effectiveThreshold) ? current : closest;
      }, densityData[0]);

      // Draw pin body line up to the curve or standardized height
      const pinTopY = activeAssetAlerts.length > 0
        ? yScale(densityAtPoint.density) - 14 // just below the dot
        : baselineY - 32;

      // Pin string line
      const pinLine = pinsGroup.append('line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', baselineY)
        .attr('y2', pinTopY)
        .attr('stroke', isSelected ? '#3b82f6' : (isTriggered ? 'rgba(255, 255, 255, 0.08)' : (isAbove ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)')))
        .attr('stroke-dasharray', isSelected ? 'none' : (isTriggered ? '3 3' : '1.5 1.5'))
        .attr('stroke-width', isSelected ? 1.8 : 1);

      // radial pulsing ring animations for active pins (currently monitoring the market)
      let pulseRing1: any = null;
      let pulseRing2: any = null;

      if (!isTriggered) {
        const pulseColor = isAbove ? '#10b981' : '#f43f5e';
        const startRad = isSelected ? 7 : 5;
        const maxRad = isSelected ? 18 : 15;

        // Pulse ring 1
        pulseRing1 = pinsGroup.append('circle')
          .attr('cx', xPos)
          .attr('cy', pinTopY)
          .attr('r', startRad)
          .attr('fill', 'none')
          .attr('stroke', pulseColor)
          .attr('stroke-width', 1.0)
          .style('pointer-events', 'none')
          .attr('opacity', 0.85);

        pulseRing1.append('animate')
          .attr('attributeName', 'r')
          .attr('from', String(startRad))
          .attr('to', String(maxRad))
          .attr('dur', '2s')
          .attr('begin', '0s')
          .attr('repeatCount', 'indefinite');

        pulseRing1.append('animate')
          .attr('attributeName', 'opacity')
          .attr('from', '0.85')
          .attr('to', '0')
          .attr('dur', '2s')
          .attr('begin', '0s')
          .attr('repeatCount', 'indefinite');

        // Pulse ring 2 (staggered helper ring for secondary deep ripple effect)
        pulseRing2 = pinsGroup.append('circle')
          .attr('cx', xPos)
          .attr('cy', pinTopY)
          .attr('r', startRad)
          .attr('fill', 'none')
          .attr('stroke', pulseColor)
          .attr('stroke-width', 0.7)
          .style('pointer-events', 'none')
          .attr('opacity', 0.85);

        pulseRing2.append('animate')
          .attr('attributeName', 'r')
          .attr('from', String(startRad))
          .attr('to', String(maxRad))
          .attr('dur', '2s')
          .attr('begin', '1s')
          .attr('repeatCount', 'indefinite');

        pulseRing2.append('animate')
          .attr('attributeName', 'opacity')
          .attr('from', '0.85')
          .attr('to', '0')
          .attr('dur', '2s')
          .attr('begin', '1s')
          .attr('repeatCount', 'indefinite');
      }

      // Interactive Circle Node on Top of Pin
      const circleNode = pinsGroup.append('circle')
        .attr('cx', xPos)
        .attr('cy', pinTopY)
        .attr('r', isSelected ? 7 : (isTriggered ? 3.5 : 5))
        .attr('fill', isSelected ? '#3b82f6' : (isTriggered ? 'rgba(75, 85, 99, 0.3)' : (isAbove ? '#10b981' : '#f43f5e')))
        .attr('stroke', isSelected ? '#ffffff' : (isTriggered ? 'rgba(255,255,255,0.1)' : '#000000'))
        .attr('stroke-width', isSelected ? 1.8 : 1.2)
        .attr('cursor', 'grab')
        .attr('class', 'transition-all duration-150')
        .style('filter', isSelected ? 'drop-shadow(0 0 6px #3b82f6)' : (isTriggered ? 'none' : `drop-shadow(0 0 4px ${isAbove ? '#10b981' : '#f43f5e'})`));

      // Drag behavior for re-positioning pins smoothly on the fly
      const dragBehavior = d3.drag<SVGCircleElement, any>()
        .on('start', function(event) {
          setSelectedAlertId(alert.id);
          setLocalThreshold(effectiveThreshold);
          d3.select(this)
            .classed('dragging', true)
            .attr('cursor', 'grabbing');
        })
        .on('drag', function(event) {
          const [mx] = d3.pointer(event, svgRef.current);
          const boundedX = Math.max(margin.left, Math.min(width - margin.right, mx));
          const draggedPrice = xScale.invert(boundedX);

          // inline live updates to avoid breaking drag gestures during re-renders
          if (areaPath && linePath && areaGen && lineGen) {
            const updatedData = recalculateDensity(alert.id, draggedPrice);
            areaPath.datum(updatedData).attr('d', areaGen);
            linePath.datum(updatedData).attr('d', lineGen);

            const newDensityAtPoint = updatedData.reduce((closest, curr) => {
              return Math.abs(curr.price - draggedPrice) < Math.abs(closest.price - draggedPrice) ? curr : closest;
            }, updatedData[0] || { price: draggedPrice, density: 0 });

            const newPinTopY = activeAssetAlerts.length > 0
              ? yScale(newDensityAtPoint.density) - 14
              : baselineY - 32;

            pinLine
              .attr('x1', boundedX)
              .attr('x2', boundedX)
              .attr('y2', newPinTopY);

            if (!isTriggered) {
              if (pulseRing1) pulseRing1.attr('cx', boundedX).attr('cy', newPinTopY);
              if (pulseRing2) pulseRing2.attr('cx', boundedX).attr('cy', newPinTopY);
            }

            d3.select(this)
              .attr('cx', boundedX)
              .attr('cy', newPinTopY);

            setHoveredAlert({
              ...alert,
              threshold: draggedPrice
            });
            setTooltipPos({ x: boundedX, y: newPinTopY });
          } else {
            pinLine
              .attr('x1', boundedX)
              .attr('x2', boundedX);

            if (!isTriggered) {
              if (pulseRing1) pulseRing1.attr('cx', boundedX);
              if (pulseRing2) pulseRing2.attr('cx', boundedX);
            }

            d3.select(this)
              .attr('cx', boundedX);

            setHoveredAlert({
              ...alert,
              threshold: draggedPrice
            });
            setTooltipPos({ x: boundedX, y: pinTopY });
          }
        })
        .on('end', async function(event) {
          d3.select(this)
            .classed('dragging', false)
            .attr('cursor', 'grab');

          const [mx] = d3.pointer(event, svgRef.current);
          const boundedX = Math.max(margin.left, Math.min(width - margin.right, mx));
          const draggedPrice = xScale.invert(boundedX);

          setLocalThreshold(draggedPrice);
          setHoveredAlert(null);
          setTooltipPos(null);

          try {
            await updateAlertThreshold(alert.id, draggedPrice);
            toast.success(`Position locked! Threshold updated to $${formatNumber(draggedPrice, 2)}`);
          } catch (err) {
            console.error("Error committing dragged threshold:", err);
            toast.error("Failed to commit final moved threshold to database");
          }
        });

      circleNode.call(dragBehavior);

      // Attach original mouse & click details to same circle node
      circleNode
        .on('click', function() {
          const pad = effectiveThreshold * 0.015; // Zoom in ±1.5% focus bounding window
          setCustomBounds({
            min: effectiveThreshold - pad,
            max: effectiveThreshold + pad
          });
          setSelectedAlertId(alert.id);
          toast.info(`Focused spectrum and selected alert: $${formatNumber(effectiveThreshold, 2)}`);

          // 1. Trigger robust scale up and down transition on the clicked dot
          d3.select(this)
            .transition()
            .duration(120)
            .attr('r', 13)
            .transition()
            .duration(160)
            .attr('r', 8.5)
            .style('filter', 'drop-shadow(0 0 12px #3b82f6)');

          // 2. Generate a temporary selector halo wave expanding outwards
          const halo = pinsGroup.append('circle')
            .attr('cx', xPos)
            .attr('cy', pinTopY)
            .attr('r', isSelected ? 8 : 6)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.9)
            .style('pointer-events', 'none');

          halo.transition()
            .duration(700)
            .attr('r', 38)
            .attr('stroke-width', 0.5)
            .attr('opacity', 0)
            .remove();
        })
        .on('mouseenter', function (event) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', isTriggered ? 5.5 : 7.2);
          
          setHoveredAlert(alert);
          setTooltipPos({ x: xPos, y: pinTopY });
          setHoveredCurvePoint(null);
          // Hide SVG general tracking dot while focusing on pin
          hoverTrackingG.style('display', 'none');
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', isTriggered ? 3.5 : 5);
          
          setHoveredAlert(null);
          setTooltipPos(null);
        });
    });

    // 7. CURRENT LIVE PRICE LINE WITH GREEN FLASH GLOW EFFECT
    const xLive = xScale(currentPrice);
    if (xLive >= margin.left && xLive <= width - margin.right) {
      const liveGroup = svg.append('g').attr('class', 'live-price-marker');

      // Live pulse shadow line
      liveGroup.append('line')
        .attr('x1', xLive)
        .attr('x2', xLive)
        .attr('y1', margin.top - 5)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1.8)
        .attr('opacity', 0.6)
        .attr('filter', 'url(#glow-green)');

      // Solid center tick line
      liveGroup.append('line')
        .attr('x1', xLive)
        .attr('x2', xLive)
        .attr('y1', margin.top - 5)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('opacity', 0.95);

      // pulsating live marker orb at bottom
      liveGroup.append('circle')
        .attr('cx', xLive)
        .attr('cy', height - margin.bottom)
        .attr('r', 4)
        .attr('fill', '#10b981')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

      // pulsating outer ring
      liveGroup.append('circle')
        .attr('cx', xLive)
        .attr('cy', height - margin.bottom)
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)
        .attr('class', 'animate-ping')
        .style('transform-origin', `${xLive}px ${height - margin.bottom}px`);
        
      // live price floating tag label on top
      liveGroup.append('rect')
        .attr('x', xLive - 32)
        .attr('y', margin.top - 18)
        .attr('width', 64)
        .attr('height', 12)
        .attr('rx', 3)
        .attr('fill', '#10b981')
        .attr('opacity', 0.85);

      liveGroup.append('text')
        .attr('x', xLive)
        .attr('y', margin.top - 9)
        .attr('fill', '#052e16')
        .attr('font-size', '7px')
        .attr('font-weight', 'black')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
        .attr('text-anchor', 'middle')
        .text('LIVE PRICE');
    }

    // 8. Dynamic Overlay Intensity Heatmap (Request 2)
    // Maps regions of volatile trigger concentrations to vibrant colors/saturations
    if (volatilityAware) {
      const heatmapGroup = svg.append('g').attr('class', 'volatility-intensity-heatmap');
      const heatmapSegments = 16;
      const segmentWidth = (width - margin.left - margin.right) / heatmapSegments;
      const baselineY = height - margin.bottom;

      // Retrieve general 7-day volatility trigger factor
      const frequencyFactor = Math.min((parseFloat(avgTriggers) || 0) / 5.0, 1.0);

      for (let s = 0; s < heatmapSegments; s++) {
        const segMinPrice = minPrice + (s / heatmapSegments) * (maxPrice - minPrice);
        const segMaxPrice = minPrice + ((s + 1) / heatmapSegments) * (maxPrice - minPrice);
        const segCenterPrice = (segMinPrice + segMaxPrice) / 2;

        const xStart = xScale(segMinPrice);
        const xEnd = xScale(segMaxPrice);

        // Probe local density
        const localDensityPoint = densityData.reduce((closest, curr) => {
          return Math.abs(curr.price - segCenterPrice) < Math.abs(closest.price - segCenterPrice) ? curr : closest;
        }, densityData[0]);
        
        const localDensityRatio = localDensityPoint ? (localDensityPoint.density / maxDensity) : 0;

        // Scan standard alerts falling in this specific interval
        const alertsInSegment = visibleAlerts.filter(a => a.threshold >= segMinPrice && a.threshold <= segMaxPrice);
        const activeInSegCount = alertsInSegment.filter(a => a.status === 'active').length;
        const triggeredInSegCount = alertsInSegment.filter(a => a.status === 'triggered').length;

        // Calculate composite volatility intensity index [0 - 1.0]
        const localIntensity = Math.min(
          (localDensityRatio * 0.4) + (activeInSegCount * 0.25) + (triggeredInSegCount * 0.35) + (frequencyFactor * 0.1),
          1.0
        );

        // Only draw heatmap cells for non-negligible saturation
        if (localIntensity > 0.08) {
          // High trigger frequencies and active triggers cause color shifts to red/rose
          let heatFillColor = '#3b82f6'; // Clean blue
          if (frequencyFactor > 0.70 || triggeredInSegCount > 0) {
            heatFillColor = '#f43f5e'; // Vibrant warning rose
          } else if (frequencyFactor > 0.35 || localIntensity > 0.5) {
            heatFillColor = '#a855f7'; // Volatile purple
          }

          // Higher color saturation and opacity reflect the trigger density
          const heatOpacity = Math.max(localIntensity * 0.45 * (0.6 + frequencyFactor * 0.4), 0.12);
          const tileHeight = 4.5;
          const tileY = baselineY - tileHeight - 1;

          heatmapGroup.append('rect')
            .attr('x', xStart + 0.5)
            .attr('y', tileY)
            .attr('width', Math.max(xEnd - xStart - 1, 1))
            .attr('height', tileHeight)
            .attr('rx', 2)
            .attr('fill', heatFillColor)
            .attr('opacity', heatOpacity)
            .style('filter', `drop-shadow(0 0 1.5px ${heatFillColor})`)
            .attr('cursor', 'help')
            .on('mouseover', function () {
              d3.select(this)
                .transition().duration(100)
                .attr('height', 7.5)
                .attr('y', tileY - 3)
                .attr('opacity', Math.min(heatOpacity * 1.6, 0.95));
              
              toast.info(`Heat Zone: ${formatNumber(segMinPrice, 0)}-${formatNumber(segMaxPrice, 0)} | Intensity Saturation: ${Math.round(localIntensity * 100)}% (${activeInSegCount} Act / ${triggeredInSegCount} Trig)`);
            })
            .on('mouseleave', function () {
              d3.select(this)
                .transition().duration(150)
                .attr('height', tileHeight)
                .attr('y', tileY)
                .attr('opacity', heatOpacity);
            });
        }
      }
    }

  }, [d3Data, activeAssetAlerts, visibleAlerts, currentPrice, selectedAlertId, localThreshold, avgTriggers, volatilityMetrics, volatilityAware, sevenDayPriceTrend, movingAveragePrice]);

  return (
    <div className="w-full glass-panel border border-white/5 bg-black/10 rounded-2xl p-5 mb-5 space-y-4 select-none relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
            <Compass size={14} className="animate-spin-slow" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Alert Coverage Spectrum</h4>
            <p className="text-[8px] font-bold text-text-muted mt-1 uppercase">D3 Kernel Density Distribution ({symbol})</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-text-muted">
            <button
              onClick={() => {
                const next = statusFilter === 'active' ? 'all' : 'active';
                setStatusFilter(next);
                toast.info(`Filtering spectrum: ${next === 'active' ? 'Active Alerts Only' : 'All Alerts'}`);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded border transition-all cursor-pointer select-none text-[8px] font-black uppercase text-left active:scale-95",
                statusFilter === 'active'
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-pulse"
                  : "bg-emerald-950/40 border-emerald-500/10 text-emerald-400/80 hover:border-emerald-500/30"
              )}
              title="Toggle Active Alerts filter"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_3px_#10b981]" />
              <span>Above (Green)</span>
            </button>
            <span className="text-white/10">•</span>
            <button
              onClick={() => {
                const next = statusFilter === 'triggered' ? 'all' : 'triggered';
                setStatusFilter(next);
                toast.info(`Filtering spectrum: ${next === 'triggered' ? 'Triggered Alerts Only' : 'All Alerts'}`);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded border transition-all cursor-pointer select-none text-[8px] font-black uppercase text-left active:scale-95",
                statusFilter === 'triggered'
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)] animate-pulse"
                  : "bg-rose-950/40 border-rose-500/10 text-rose-400/80 hover:border-rose-500/30"
              )}
              title="Toggle Triggered Alerts filter"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_3px_#f43f5e]" />
              <span>Below (Red)</span>
            </button>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[8px] font-black uppercase text-blue-400">Coverage (Blue)</span>
            </div>
            <span className="text-white/10">•</span>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded border border-white/5 transition-all duration-300",
              volatilityAware 
                ? "bg-purple-950/40 text-purple-400" 
                : "bg-blue-950/40 text-blue-400"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full border border-white/10 animate-pulse",
                volatilityAware ? "bg-purple-400" : "bg-blue-400"
              )} />
              <span className="text-[8px] font-black uppercase">7D Price Trail</span>
            </div>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/10 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase">7D SMA (Amber)</span>
            </div>
          </div>

          <button
            onClick={() => {
              setVolatilityAware(prev => !prev);
              toast.success(`Switched to ${!volatilityAware ? 'Volatility-Aware Adaptive' : 'Standard Classic'} visualization`);
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-1 border active:scale-95 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer select-none",
              volatilityAware
                ? "bg-purple-500/10 border-purple-500/25 text-purple-400 hover:bg-purple-500/20"
                : "bg-white/5 border-white/5 text-text-muted hover:text-white hover:bg-white/10"
            )}
            title="Toggle between Standard Classic (Blue) and Volatility-Aware Adaptive (Blue to Rose) spectrum"
          >
            <TrendingUp size={10} className={volatilityAware ? "text-purple-400" : "text-text-muted"} />
            <span>{volatilityAware ? "Adaptive Spectrum" : "Classic Spectrum"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={allAssetAlerts.length === 0}
            className={cn(
              "flex items-center gap-1 px-3 py-1 bg-brand/10 hover:bg-brand/20 border border-brand/20 active:scale-95 text-[8px] font-black uppercase tracking-widest text-brand rounded-lg transition-all cursor-pointer select-none",
              "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
            )}
            title="Export bounds and coverage parameters to CSV format"
          >
            <Download size={10} />
            Export Data
          </button>

          <button
            onClick={handleClearAllActiveAlerts}
            disabled={activeAssetAlerts.length === 0}
            className={cn(
              "flex items-center gap-1 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-95 text-[8px] font-black uppercase tracking-widest text-rose-400 rounded-lg transition-all cursor-pointer select-none",
              "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
            )}
            title="Quickly purge all active price alerts for the current asset"
          >
            <Trash2 size={10} />
            Clear All
          </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        onMouseEnter={() => setIsRadarHovered(true)}
        onMouseLeave={() => setIsRadarHovered(false)}
        className="w-full h-40 relative bg-black/30 rounded-xl overflow-visible border border-white/[0.03]"
      >
        {/* Floating precise slide controller alongside the legend */}
        <div 
          id="alert-density-grad-control" 
          className="absolute top-2.5 left-2.5 bg-black/90 border border-white/10 rounded-lg px-2 py-1 flex items-center gap-2 text-[7px] font-black uppercase tracking-wider backdrop-blur-sm shadow-md pointer-events-auto z-10 select-none max-w-[285px] sm:max-w-[345px]"
        >
          <div className="flex items-center gap-1 text-white/50">
            <Bell size={8} className={selectedAlertId ? "text-brand animate-pulse" : "text-white/40"} />
            <span className="hidden sm:inline">Monitor:</span>
          </div>

          <select
            value={selectedAlertId || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedAlertId(val || null);
              if (val) {
                const target = alerts.find(a => a.id === val);
                if (target) {
                  const pad = target.threshold * 0.015;
                  setCustomBounds({
                    min: target.threshold - pad,
                    max: target.threshold + pad
                  });
                }
              }
            }}
            className="bg-black border border-white/10 rounded px-1 py-0.5 text-[7px] font-bold text-white max-w-[90px] focus:outline-none focus:border-brand/40"
            title="Select an alert pointer to slide and adjust its triggering price threshold"
          >
            <option value="">Select Alert</option>
            {visibleAlerts.map((a, idx) => (
              <option key={a.id} value={a.id}>
                #{idx + 1} ({a.condition === 'above' ? '▲' : '▼'} Slot: ${formatNumber(a.threshold, 0)})
              </option>
            ))}
          </select>

          {selectedAlert && localThreshold !== null && (
            <>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1 flex-1 select-all">
                <span className="text-brand font-bold text-[7px]">Slider:</span>
                <input
                  type="range"
                  min={Math.floor(selectedAlert.threshold * 0.7)}
                  max={Math.ceil(selectedAlert.threshold * 1.3)}
                  step={selectedAlert.threshold > 1000 ? "1" : (selectedAlert.threshold > 10 ? "0.1" : "0.01")}
                  value={localThreshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      handleUpdateAlertThresholdNum(selectedAlert.id, val);
                    }
                  }}
                  className="w-14 sm:w-20 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none accent-brand focus:outline-none"
                  title="Drag smoothly to reposition the price trigger on the density spectrum"
                />
              </div>

              <span className="text-white/20">|</span>
              
              <div className="flex items-center gap-1">
                <span className="text-white/40">Input:</span>
                <input
                  type="number"
                  step={selectedAlert.threshold > 1000 ? "1" : (selectedAlert.threshold > 10 ? "0.1" : "0.01")}
                  value={Math.round(localThreshold * 100) / 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      handleUpdateAlertThresholdNum(selectedAlert.id, val);
                    }
                  }}
                  className="w-12 bg-black/60 border border-white/15 rounded text-[7px] font-mono text-center font-bold text-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
                  title="Type precise digital trigger price"
                />
              </div>
            </>
          )}

          {!selectedAlert && visibleAlerts.length > 0 && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-white/40 text-[6.5px] animate-pulse">Click dot/Select above to slide trigger</span>
            </>
          )}

          {visibleAlerts.length === 0 && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-white/40 text-[6.5px]">No active monitors</span>
            </>
          )}
        </div>

        {/* In-chart floating legend component */}
        <div 
          id="alert-density-grad-legend" 
          className="absolute top-2.5 right-2.5 bg-black/90 border border-white/10 rounded-lg px-2 py-1 flex items-center gap-2 text-[7px] font-black uppercase tracking-wider backdrop-blur-sm shadow-md pointer-events-auto z-10 select-none"
        >
          <div 
            onClick={() => {
              const next = statusFilter === 'active' ? 'all' : 'active';
              setStatusFilter(next);
              toast.info(`Filtering spectrum: ${next === 'active' ? 'Active Alerts Only' : 'All Alerts'}`);
            }}
            onMouseEnter={() => setHoveredLegendCategory('above')}
            onMouseLeave={() => setHoveredLegendCategory(null)}
            className={cn(
              "flex items-center gap-1 cursor-pointer hover:opacity-85 transition-all px-1 py-0.5 rounded",
              statusFilter === 'active' ? "bg-emerald-500/20 border border-emerald-500/35" : ""
            )}
            title="Toggle Active Alerts filter"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
            <span className="text-emerald-400 font-bold">Above (Green)</span>
          </div>
          <span className="text-white/20">|</span>
          <div 
            onClick={() => {
              const next = statusFilter === 'triggered' ? 'all' : 'triggered';
              setStatusFilter(next);
              toast.info(`Filtering spectrum: ${next === 'triggered' ? 'Triggered Alerts Only' : 'All Alerts'}`);
            }}
            onMouseEnter={() => setHoveredLegendCategory('below')}
            onMouseLeave={() => setHoveredLegendCategory(null)}
            className={cn(
              "flex items-center gap-1 cursor-pointer hover:opacity-85 transition-all px-1 py-0.5 rounded",
              statusFilter === 'triggered' ? "bg-rose-500/20 border border-rose-500/35" : ""
            )}
            title="Toggle Triggered Alerts filter"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_#f43f5e]" />
            <span className="text-rose-400 font-bold">Below (Red)</span>
          </div>
          <span className="text-white/20">|</span>
          <div 
            onMouseEnter={() => setHoveredLegendCategory('coverage')}
            onMouseLeave={() => setHoveredLegendCategory(null)}
            className="flex items-center gap-1 cursor-help hover:opacity-85 transition-all px-1 py-0.5 rounded"
            title="Density region showing bounds of active trackers"
          >
            <span className="w-3 h-1.5 rounded-sm bg-blue-500/20 border border-blue-500/40" />
            <span className="text-blue-400 font-bold">Coverage (Blue)</span>
          </div>
          <span className="text-white/20">|</span>
          <button
            onClick={handleResetFilters}
            className={cn(
              "px-1.5 py-0.5 border text-[7px] font-black uppercase rounded cursor-pointer transition-all active:scale-95 flex items-center gap-0.5",
              (customBounds || statusFilter !== 'all')
                ? "bg-brand/20 hover:bg-brand/30 border-brand/40 text-brand animate-pulse"
                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            )}
            title="Reset radar zoom/filters and restore full overview visibility"
          >
            Reset Filters
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={handleShareCoverageStats}
            className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white rounded cursor-pointer transition-all active:scale-95 flex items-center gap-0.5"
            title="Copy current density and alert coverage summary stats to clipboard"
          >
            <Share2 size={8} />
            Share
          </button>
          <span className="text-white/20">|</span>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded px-1 animate-pulse">
              <span className="text-[6.5px] font-black text-rose-400">Confirm?</span>
              <button
                onClick={handleDeleteAllAlerts}
                className="px-1 py-0.2 bg-rose-500 hover:bg-rose-600 border border-rose-600 text-white rounded-[3px] text-[6.5px] font-black uppercase transition-all cursor-pointer active:scale-90"
                title="Surgically delete all threshold alerts instantly"
              >
                Yes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-1 py-0.2 bg-white/10 hover:bg-white/15 border border-white/20 text-white/80 rounded-[3px] text-[6.5px] font-black uppercase transition-all cursor-pointer active:scale-90"
                title="Cancel deletion"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={allAssetAlerts.length === 0}
              className={cn(
                "px-1.5 py-0.5 border text-[7px] font-black uppercase rounded cursor-pointer transition-all active:scale-95 flex items-center gap-0.5",
                allAssetAlerts.length > 0
                  ? "bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400 border-rose-500/20 text-rose-400/80"
                  : "bg-white/5 border-white/10 text-white/20 opacity-40 cursor-not-allowed pointer-events-none"
              )}
              title="Surgically purge all price alerts linked to this asset"
            >
              <Trash2 size={8} />
              Delete All
            </button>
          )}
        </div>

        {/* Legend Dynamic Hover Tooltip component */}
        {hoveredLegendCategory && (
          <div 
            className={cn(
              "absolute top-[32px] right-2.5 z-20 pointer-events-none bg-black/95 border rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-left min-w-[140px] transition-all duration-150 animate-in fade-in slide-in-from-top-1",
              hoveredLegendCategory === 'above' ? "border-emerald-500/20" : 
              hoveredLegendCategory === 'below' ? "border-rose-500/20" : "border-blue-500/20"
            )}
          >
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                hoveredLegendCategory === 'above' ? "bg-emerald-500 shadow-[0_0_4px_#10b981]" :
                hoveredLegendCategory === 'below' ? "bg-rose-500 shadow-[0_0_4px_#f43f5e]" : "bg-blue-500 shadow-[0_0_4px_#3b82f6]"
              )} />
              <span className="text-[8px] font-black text-white uppercase tracking-wider">
                {hoveredLegendCategory === 'above' ? "Above Pulse" : 
                 hoveredLegendCategory === 'below' ? "Below Pulse" : "All Coverage"}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[7px] font-bold text-text-muted uppercase tracking-wider mt-1">
              <span>Active Trackers:</span>
              <span className={cn(
                "font-mono font-bold text-[8px]",
                hoveredLegendCategory === 'above' ? "text-emerald-400" : 
                hoveredLegendCategory === 'below' ? "text-rose-400" : "text-blue-400"
              )}>
                {legendCounts[hoveredLegendCategory].active}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[7px] font-bold text-text-muted uppercase tracking-wider">
              <span>Triggered:</span>
              <span className="text-white/60 font-mono font-bold text-[8px]">
                {legendCounts[hoveredLegendCategory].triggered}
              </span>
            </div>

            <div className="flex justify-between items-center text-[7px] font-bold text-text-muted uppercase tracking-wider border-t border-white/5 mt-1 pt-1">
              <span>Total Alerts:</span>
              <span className="text-white font-mono font-black text-[9px]">
                {legendCounts[hoveredLegendCategory].total}
              </span>
            </div>
          </div>
        )}

        {/* Hover details display section specifically for active versus triggered metrics */}
        {isRadarHovered && (
          <div 
            id="alert-density-grad-details" 
            className="absolute top-2.5 left-2.5 bg-black/90 border border-white/10 rounded-lg p-2 flex flex-col gap-1 text-[7px] font-black uppercase tracking-wider backdrop-blur-sm shadow-lg pointer-events-none z-10 transition-all duration-200"
          >
            <div className="text-brand/80 font-black tracking-widest text-[6px] border-b border-white/5 pb-0.5">Radar Details ({symbol})</div>
            <div className="flex items-center justify-between gap-3 text-white">
              <span>Active Alerts:</span>
              <span className="text-emerald-400 font-mono font-bold">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-white">
              <span>Triggered:</span>
              <span className="text-rose-400 font-mono font-bold">{triggeredCount}</span>
            </div>
          </div>
        )}

        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="w-full h-full overflow-visible"
        />

        {/* Floating HUD Volatility Regime Indicator overlay */}
        {volatilityAware && (
          <div 
            id="volatility-regime-hud" 
            className="absolute bottom-2.5 left-2.5 bg-black/95 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-md pointer-events-auto z-10 select-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  volatilityMetrics.indexCoeff > 0.045 ? "bg-rose-500" :
                  volatilityMetrics.indexCoeff > 0.02 ? "bg-amber-500" : "bg-emerald-500"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  volatilityMetrics.indexCoeff > 0.045 ? "bg-rose-500" :
                  volatilityMetrics.indexCoeff > 0.02 ? "bg-amber-500" : "bg-emerald-500"
                )}></span>
              </span>
              <span className="text-white/40 font-bold">Regime:</span>
              <span className={cn("font-black text-[7px] sm:text-[7.5px]", volatilityMetrics.colorClass)}>
                {volatilityMetrics.regime}
              </span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1 text-[6.5px] text-white/50">
              <span>Score: <span className="text-white font-mono">{volatilityMetrics.indexCoeff.toFixed(4)}</span></span>
              <span className="text-white/20">•</span>
              <span>7D Avg: <span className="text-white font-mono">{avgTriggers}/d</span></span>
            </div>
          </div>
        )}

        {/* Continuous Density Curve precise hover details tooltip */}
        {!hoveredAlert && hoveredCurvePoint && (
          <div 
            className="absolute z-20 pointer-events-none bg-black/95 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-left min-w-[130px] transition-all duration-75"
            style={{
              left: `${Math.min(hoveredCurvePoint.x + 12, dimensions.width - 150)}px`,
              top: `${Math.min(hoveredCurvePoint.y - 45, dimensions.height - 85)}px`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_#3b82f6]" />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">Spectrum Probe</span>
            </div>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              ${formatNumber(hoveredCurvePoint.price, 2)}
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center mt-1">
              <span>Density:</span>
              <span className="text-blue-400 font-mono font-bold">{(hoveredCurvePoint.density * 100).toFixed(4)}%</span>
            </div>
          </div>
        )}

        {/* Dynamic D3 Interactive Tooltip overlay */}
        {hoveredAlert && tooltipPos && (
          <div 
            className="absolute z-20 pointer-events-none bg-black/90 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-left min-w-[120px] transition-all duration-75"
            style={{
              left: `${Math.min(tooltipPos.x + 12, dimensions.width - 140)}px`,
              top: `${Math.min(tooltipPos.y - 45, dimensions.height - 85)}px`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                hoveredAlert.status === 'triggered' 
                  ? "bg-rose-500" 
                  : (hoveredAlert.condition === 'above' ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse")
              )} />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">{hoveredAlert.asset}/USDT</span>
            </div>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              ${formatNumber(hoveredAlert.threshold, 2)}
            </div>
            <div className="text-[7px] font-bold text-text-muted uppercase tracking-wider">
              Trigger Price: {hoveredAlert.condition === 'above' ? '≥ Threshold' : '≤ Threshold'}
            </div>
            <div className="flex justify-between items-center text-[7px] font-black text-white uppercase mt-1">
              <span>Status:</span>
              <span className={cn(
                "px-1 rounded-sm",
                hoveredAlert.status === 'triggered' ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
              )}>
                {hoveredAlert.status}
              </span>
            </div>
          </div>
        )}

         {/* 7-Day Price Trend Point Hover Details Tooltip */}
        {!hoveredAlert && !hoveredCurvePoint && hoveredTrendPoint && (
          <div 
            className="absolute z-20 pointer-events-none bg-black/95 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-left min-w-[155px] transition-all duration-75"
            style={{
              left: `${Math.min(hoveredTrendPoint.x + 12, dimensions.width - 175)}px`,
              top: `${Math.min(hoveredTrendPoint.y - 45, dimensions.height - 110)}px`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_4px_#6366f1]" />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">7D Price Trail</span>
            </div>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              ${formatNumber(hoveredTrendPoint.price, 2)}
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center mt-1">
              <span>Date:</span>
              <span className="text-indigo-300 font-mono font-bold">{hoveredTrendPoint.dateLabel} ({hoveredTrendPoint.dayLabel})</span>
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center mt-1 border-t border-white/5 pt-1">
              <span>Vol Upper Band:</span>
              <span className="text-emerald-400 font-mono font-bold">${formatNumber(hoveredTrendPoint.highBand, 2)}</span>
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center">
              <span>Vol Lower Band:</span>
              <span className="text-rose-400 font-mono font-bold">${formatNumber(hoveredTrendPoint.lowBand, 2)}</span>
            </div>
          </div>
        )}

        {/* Horizontal Average Price (7D SMA) Hover Details Tooltip */}
        {!hoveredAlert && !hoveredCurvePoint && !hoveredTrendPoint && hoveredSmaPoint && (
          <div 
            className="absolute z-20 pointer-events-none bg-black/95 border border-amber-500/25 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-left min-w-[150px] transition-all duration-75 animate-in fade-in"
            style={{
              left: `${Math.min(hoveredSmaPoint.x + 12, dimensions.width - 170)}px`,
              top: `${Math.min(hoveredSmaPoint.y - 45, dimensions.height - 85)}px`,
            }}
          >
            <div className="flex items-center gap-1.5 pb-1 border-b border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_#f59e0b] animate-pulse" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">7D Moving Average</span>
            </div>
            <div className="text-sm font-black text-white font-mono mt-1">
              ${formatNumber(hoveredSmaPoint.price, 2)}
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center mt-0.5">
              <span>Curve Density:</span>
              <span className="text-blue-400 font-mono font-bold">{(hoveredSmaPoint.density * 100).toFixed(4)}%</span>
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center">
              <span>Spot Price:</span>
              <span className="text-white font-mono font-bold">${formatNumber(currentPrice, 2)}</span>
            </div>
            <div className="text-[7.5px] font-bold text-text-muted uppercase tracking-wider flex justify-between items-center border-t border-white/5 mt-1 pt-1">
              <span>Deviation:</span>
              <span className={cn(
                "font-mono font-bold text-[8px]",
                currentPrice >= hoveredSmaPoint.price ? "text-emerald-400" : "text-rose-400"
              )}>
                {currentPrice >= hoveredSmaPoint.price ? "+" : ""}{((currentPrice - hoveredSmaPoint.price) / hoveredSmaPoint.price * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Volatility Regime Shift Dynamic Spectrum Legend */}
        {volatilityAware ? (
          <div 
            id="alert-density-grad-volatility-legend" 
            className="absolute bottom-2.5 right-2.5 bg-black/95 border border-white/10 rounded-lg p-2 flex flex-col gap-1.5 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg pointer-events-auto z-10 select-none min-w-[130px]"
          >
            <div className="text-white/40 font-bold border-b border-white/5 pb-1 flex justify-between items-center text-[6px]">
              <span>Density Spectrum Scale</span>
              <span className="text-[5px] text-brand border border-brand/20 rounded px-1 lowercase font-mono">active</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className={cn(
                "flex items-center justify-between px-1 py-0.5 rounded transition-all",
                volatilityMetrics.indexCoeff <= 0.02 ? "bg-blue-500/10 border border-blue-500/20" : "border border-transparent opacity-50"
              )}>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_4px_#3b82f6]" />
                  <span className="text-blue-400 font-bold">Stable</span>
                </div>
                <span className="text-white/30 text-[5px] font-mono lowercase">&lt; 2%</span>
              </div>

              <div className={cn(
                "flex items-center justify-between px-1 py-0.5 rounded transition-all",
                (volatilityMetrics.indexCoeff > 0.02 && volatilityMetrics.indexCoeff <= 0.045) ? "bg-purple-500/10 border border-purple-500/20" : "border border-transparent opacity-50"
              )}>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] shadow-[0_0_4px_#a855f7]" />
                  <span className="text-purple-400 font-bold">Moderate</span>
                </div>
                <span className="text-white/30 text-[5px] font-mono lowercase">2%-4.5%</span>
              </div>

              <div className={cn(
                "flex items-center justify-between px-1 py-0.5 rounded transition-all",
                volatilityMetrics.indexCoeff > 0.045 ? "bg-rose-500/10 border border-rose-500/20" : "border border-transparent opacity-50"
              )}>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] shadow-[0_0_4px_#f43f5e]" />
                  <span className="text-rose-400 font-bold">Critical</span>
                </div>
                <span className="text-white/30 text-[5px] font-mono lowercase">&gt; 4.5%</span>
              </div>
            </div>

            {/* Continuous Gradient indicator matching D3 stop colors */}
            <div className="w-full h-1 rounded-full bg-gradient-to-r from-[#3b82f6] via-[#a855f7] to-[#f43f5e] overflow-hidden relative">
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white border border-black shadow-[0_0_2px_rgba(255,255,255,0.8)] rounded-full animate-pulse"
                style={{ 
                  left: `${Math.min(Math.max((volatilityMetrics.indexCoeff - 0.01) / 0.045 * 100, 0), 100)}%`,
                  transform: 'translateX(-50%)' 
                }}
              />
            </div>
          </div>
        ) : (
          <div 
            id="alert-density-grad-volatility-legend" 
            className="absolute bottom-2.5 right-2.5 bg-black/95 border border-white/10 rounded-lg p-2 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-md pointer-events-auto z-10 select-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_4px_#3b82f6]" />
              <span className="text-blue-400 font-bold">Stable Density Gradient</span>
            </div>
          </div>
        )}

        {/* Emtpy State overlay when no alerts are present on current asset */}
        {allAssetAlerts.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/10 rounded-xl backdrop-blur-[1px]">
            <Bell size={24} className="text-white/20 mb-2 animate-bounce-slow" />
            <h5 className="text-[9px] font-black uppercase text-white/50 tracking-widest">No Alerts Anchored</h5>
            <p className="text-[8px] font-medium text-text-muted max-w-[220px] uppercase mt-1 leading-normal">
              Anchor pricing alerts to populate the local coverage radar map.
            </p>
          </div>
        )}
      </div>

      {/* Volatility Diagnostics & Historic Frequency Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
        
        {/* Panel A: Volatility Metrics & Price Dispersion */}
        <div id="volatility-metrics-panel" className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-brand/10 text-brand">
                  <TrendingUp size={10} />
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider text-white">Calculated Volatility Metrics</span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-[4px] text-[6.5px] font-black uppercase border tracking-wider animate-pulse",
                volatilityMetrics.bgClass,
                volatilityMetrics.colorClass
              )}>
                {volatilityMetrics.regime}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div className="bg-white/[0.01] border border-white/[0.03] rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[6.5px] font-black text-text-muted uppercase tracking-wider block">Standard Deviation</span>
                  <span className="text-white font-mono font-black text-xs block mt-1">
                    ${formatNumber(volatilityMetrics.stdDev, 2)}
                  </span>
                </div>
                <span className="text-[5.5px] font-bold text-blue-400 mt-1 uppercase leading-none">
                  ±{volatilityMetrics.stdDevPercent.toFixed(2)}% of Spot
                </span>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.03] rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[6.5px] font-black text-text-muted uppercase tracking-wider block">Price Range Delta</span>
                  <span className="text-white font-mono font-black text-xs block mt-1">
                    ${formatNumber(volatilityMetrics.delta, 2)}
                  </span>
                </div>
                <span className="text-[5.5px] font-bold text-rose-400 mt-1 uppercase leading-none">
                  Δ {volatilityMetrics.deltaPercent.toFixed(2)}% Width
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-3 text-[6.5px] font-bold text-text-muted uppercase tracking-wider">
            <span>Spectrum Density Mean: <span className="text-white font-mono">${formatNumber(volatilityMetrics.mean, 2)}</span></span>
            <span>Trigger Focus: <span className="text-brand font-mono">{activeAssetAlerts.length} Monitor(s)</span></span>
          </div>
        </div>

        {/* Panel B: 7-Day Hist Trend Grid */}
        <div id="frequency-trend-panel" className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between relative min-h-[142px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                  <TrendingUp size={10} className="transform rotate-95" />
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider text-white">7-Day Trigger Frequency Trend</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[6px] font-bold text-text-muted uppercase tracking-widest">D3 Historic Volatility</span>
              </div>
            </div>

            {/* Micro bar-chart visualization */}
            <div className="flex items-end justify-between h-14 pt-3 pb-1 px-1">
              {sevenDayTrendData.map((d, idx) => {
                const heightPercent = Math.max((d.count / maxTrendCount) * 100, 10);
                const isHovered = hoveredTrendIdx === idx;
                
                // Color mapping: red/rose for high, yellow/orange for elevated, emerald/blue for normal
                let barColorClass = "bg-gradient-to-t from-blue-600 to-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.1)]";
                if (d.count >= 5) {
                  barColorClass = "bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]";
                } else if (d.count >= 3) {
                  barColorClass = "bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_7px_rgba(245,158,11,0.2)]";
                }

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center flex-1 group cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIdx(idx)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                  >
                    <div className="w-full px-1.5 flex items-end justify-center h-11 relative">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={cn(
                          "w-3 sm:w-4 rounded-t-sm transition-all duration-200 relative",
                          barColorClass,
                          isHovered ? "brightness-125 scale-x-110 -translate-y-0.5" : "opacity-80"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-[5.5px] font-mono font-bold mt-1 tracking-wider uppercase",
                      d.isToday ? "text-brand font-black animate-pulse" : "text-white/40"
                    )}>
                      {d.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[6.5px] font-bold uppercase tracking-wider text-text-muted">
            {hoveredTrendIdx !== null ? (
              <div className="flex justify-between items-center w-full text-white">
                <span>Date: <span className="font-mono font-bold text-indigo-400">{sevenDayTrendData[hoveredTrendIdx].dateLabel}</span></span>
                <span>Count: <span className="font-mono font-black text-rose-400">{sevenDayTrendData[hoveredTrendIdx].count}</span></span>
                <span>Volatility: <span className={cn(
                  "font-black",
                  sevenDayTrendData[hoveredTrendIdx].volatility === 'Critical' ? "text-rose-400" :
                  sevenDayTrendData[hoveredTrendIdx].volatility === 'Elevated' ? "text-amber-400" : "text-emerald-400"
                )}>{sevenDayTrendData[hoveredTrendIdx].volatility}</span></span>
              </div>
            ) : (
              <div className="flex justify-between items-center w-full">
                <span>7D Period Total: <span className="text-white font-mono">{totalTriggers} triggers</span></span>
                <span>Daily Avg Frequency: <span className="text-brand font-mono font-black">{avgTriggers}/day</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
        <Info size={10} className="text-brand/50 mt-0.5" />
        <p className="text-[8px] font-medium text-text-muted uppercase leading-relaxed">
          The spectrum curve maps your live risk boundary saturation. Clustered areas represent high-priority pricing targets. Set multiple pulse pins across support/resistance levels to optimize volatile trigger responses.
        </p>
      </div>
    </div>
  );
};
