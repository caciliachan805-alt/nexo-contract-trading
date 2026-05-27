import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Sparkles, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  className?: string;
  tradesCount?: number;
}

const formatDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateString = (str: string): Date | null => {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
};

const formatNaturalDate = (dateStr: string): string => {
  const parsed = parseDateString(dateStr);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className,
  tradesCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view month to start date, or current date if empty
  const [currentViewDate, setCurrentViewDate] = useState(() => {
    const start = parseDateString(startDate);
    return start ? new Date(start) : new Date();
  });

  const viewYear = currentViewDate.getFullYear();
  const viewMonth = currentViewDate.getMonth(); // 0-indexed

  // Sync view month when startDate changes and panel is opened
  useEffect(() => {
    if (isOpen && startDate) {
      const parsed = parseDateString(startDate);
      if (parsed) {
        setCurrentViewDate(new Date(parsed));
      }
    }
  }, [isOpen, startDate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentViewDate(prev => {
      const nextDate = new Date(prev);
      if (direction === 'prev') {
        nextDate.setMonth(nextDate.getMonth() - 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      return nextDate;
    });
  };

  // Generate date grid
  const daysGrid = useMemo(() => {
    // start day of the month
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    const grid: (Date | null)[] = [];
    // Padding for starting offset
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(viewYear, viewMonth, d));
    }
    
    return grid;
  }, [viewYear, viewMonth]);

  const parsedStart = useMemo(() => parseDateString(startDate), [startDate]);
  const parsedEnd = useMemo(() => parseDateString(endDate), [endDate]);

  const handleDayClick = (day: Date) => {
    const clickedStr = formatDateString(day);
    
    if (!startDate || (startDate && endDate)) {
      // First click: select start date, clear end date
      onChange(clickedStr, '');
    } else {
      // Second click
      const startObj = parseDateString(startDate);
      if (startObj && day >= startObj) {
        onChange(startDate, clickedStr);
        setIsOpen(false); // Auto close on selecting full range
      } else {
        // If clicked day is before start day, treat as new start day
        onChange(clickedStr, '');
      }
    }
  };

  const getPresetDates = (days: number) => {
    const today = new Date();
    const toStr = formatDateString(today);
    
    const fromDateObj = new Date();
    fromDateObj.setDate(today.getDate() - days);
    const fromStr = formatDateString(fromDateObj);
    return { fromStr, toStr };
  };

  const handlePresetClick = (days: number | 'all') => {
    if (days === 'all') {
      onChange('', '');
    } else {
      const { fromStr, toStr } = getPresetDates(days);
      onChange(fromStr, toStr);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  // Helper styles for selection status
  const getDayStyles = (day: Date | null) => {
    if (!day) return 'opacity-0 pointer-events-none';
    
    const dayStr = formatDateString(day);
    const isStart = startDate === dayStr;
    const isEnd = endDate === dayStr;
    
    const isBetween = 
      parsedStart && 
      parsedEnd && 
      day > parsedStart && 
      day < parsedEnd;

    const isToday = formatDateString(new Date()) === dayStr;

    return cn(
      "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] font-bold rounded-lg transition-all relative cursor-pointer font-mono select-none",
      isStart && "bg-brand text-bg-dark font-black shadow-[0_0_10px_rgba(0,242,255,0.4)] z-10 scale-105",
      isEnd && "bg-brand text-bg-dark font-black shadow-[0_0_10px_rgba(0,242,255,0.4)] z-10 scale-105",
      isBetween && "bg-brand/10 text-brand border border-brand/20",
      !isStart && !isEnd && !isBetween && "text-text-muted/80 hover:bg-white/10 hover:text-white",
      isToday && !isStart && !isEnd && "border border-amber-500/40 text-amber-500 font-black"
    );
  };

  const isPresetActive = (days: number | 'all') => {
    if (days === 'all') {
      return !startDate && !endDate;
    }
    const { fromStr, toStr } = getPresetDates(days);
    return startDate === fromStr && endDate === toStr;
  };

  const displayLabel = useMemo(() => {
    if (startDate && endDate) {
      return `${formatNaturalDate(startDate)} - ${formatNaturalDate(endDate)}`;
    }
    if (startDate) {
      return `${formatNaturalDate(startDate)} - Select End Date`;
    }
    return "All Time Intervals";
  }, [startDate, endDate]);

  return (
    <div id="date-range-picker-root" ref={containerRef} className={cn("relative z-20", className)}>
      {/* Target Trigger Button */}
      <div 
        id="date-range-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:border-brand/35 focus:border-brand/40 transition-all select-none group",
          isOpen && "border-brand/50 bg-white/10",
          (startDate || endDate) && "border-brand/30 bg-brand/5"
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={12} className={cn("text-text-muted transition-colors group-hover:text-brand", (startDate || endDate) && "text-brand")} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider font-mono",
            (startDate || endDate) ? "text-brand" : "text-text-muted/80"
          )}>
            {displayLabel}
          </span>
          {tradesCount !== undefined && (startDate || endDate) && (
            <span id="date-range-trades-count-badge" className="px-1.5 py-0.5 text-[8px] font-black font-mono leading-none bg-brand/20 text-brand rounded-full border border-brand/30 animate-fade-in shadow-[0_0_8px_rgba(0,242,255,0.15)] select-none">
              {tradesCount} trades
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(startDate || endDate) && (
            <button 
              id="date-range-clear-btn"
              onClick={handleClear}
              className="p-1 rounded-full text-text-muted hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer"
              title="Clear Filter"
            >
              <X size={10} />
            </button>
          )}
          <ChevronLeft size={10} className={cn("text-text-muted transform transition-transform duration-200", isOpen ? "rotate-90" : "-rotate-90")} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="date-range-picker-popover"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute left-0 mt-1 max-w-[95dvw] w-[310px] sm:w-[420px] bg-bg-dark/95 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-4 z-50 md:left-auto md:right-0"
          >
            {/* Quick Filters Horizontal Row */}
            <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
              <span className="text-[8px] font-black text-text-muted uppercase tracking-widest px-0.5">Quick Filters</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {([
                  { label: 'Last 24h', days: 1 },
                  { label: 'Today', days: 0 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 },
                  { label: '90 Days', days: 90 },
                  { label: 'All Time', days: 'all' }
                ] as { label: string; days: number | 'all' }[]).map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset.days)}
                    className={cn(
                      "py-1 px-2.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap select-none cursor-pointer",
                      isPresetActive(preset.days)
                        ? "bg-brand text-bg-dark border-brand shadow-[0_0_8px_rgba(0,242,255,0.3)]"
                        : "bg-white/5 border-white/5 text-text-muted hover:border-white/20 hover:text-white"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Calendar Panel */}
            <div className="flex flex-col">
              {/* Calendar Header with navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button 
                  type="button"
                  onClick={() => changeMonth('prev')}
                  className="p-1 rounded-lg border border-white/5 bg-white/5 text-text-muted hover:text-white hover:border-white/15 transition-all cursor-pointer"
                >
                  <ChevronLeft size={12} />
                </button>
                <div className="text-[10px] font-black uppercase tracking-widest font-mono text-brand flex items-center gap-1.5">
                  <Sparkles size={10} className="text-brand opacity-60" />
                  {currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button 
                  type="button"
                  onClick={() => changeMonth('next')}
                  className="p-1 rounded-lg border border-white/5 bg-white/5 text-text-muted hover:text-white hover:border-white/15 transition-all cursor-pointer"
                >
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Day names row */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(header => (
                  <span key={header} className="text-[8px] font-black text-text-muted/60 uppercase tracking-tighter">
                    {header}
                  </span>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                {daysGrid.map((day, idx) => (
                  <div 
                    key={day ? day.toISOString() : `empty-${idx}`} 
                    onClick={() => day && handleDayClick(day)}
                    className={getDayStyles(day)}
                  >
                    {day ? day.getDate() : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom active feedback panel with Reset Button */}
            <div className="flex items-stretch gap-2">
              <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-text-muted whitespace-nowrap flex-1">
                <div className="flex items-center gap-1.5">
                  <Sliders size={8} className="text-brand" />
                  <span>Range Interval Selected:</span>
                </div>
                <span className="font-mono text-white text-[9px] font-black lowercase tracking-normal">
                  {startDate ? `${startDate} to ${endDate || '...'}` : 'all time logs on-chain'}
                </span>
              </div>
              <button
                id="date-range-popover-reset-btn"
                type="button"
                onClick={(e) => {
                  handleClear(e);
                  setIsOpen(false);
                }}
                disabled={!startDate && !endDate}
                className={cn(
                  "font-black text-[8px] uppercase tracking-widest px-3 rounded-lg transition-all whitespace-nowrap flex items-center justify-center border",
                  (startDate || endDate)
                    ? "bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border-rose-500/20 hover:border-rose-500/40 cursor-pointer active:scale-95"
                    : "bg-white/5 text-text-muted/30 border-white/5 cursor-not-allowed"
                )}
                title="Reset Date Range Filter"
              >
                Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
