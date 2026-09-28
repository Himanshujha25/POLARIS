import React from 'react';
import {
  Compass,
  Thermometer,
  Wind,
  Users,
  Fuel,
  ShieldAlert,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Boxes,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

// Formats inline tokens: bold (**text**), italic (*text*), inline code (`code`)
export function formatInlineText(text) {
  if (!text) return null;
  const tokens = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`b-${match.index}`} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={`c-${match.index}`} className="rounded bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`i-${match.index}`} className="italic text-slate-500 dark:text-slate-400">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

// Map section title to tactical icon and accent theme
function getSectionTheme(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('executive') || lower.includes('polar summary') || lower.includes('overview')) {
    return {
      icon: Compass,
      accent: 'border-l-cyan-500 text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
    };
  }
  if (lower.includes('weather') || lower.includes('environmental') || lower.includes('ambient') || lower.includes('wind')) {
    return {
      icon: Thermometer,
      accent: 'border-l-sky-500 text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
    };
  }
  if (lower.includes('personnel') || lower.includes('sortie') || lower.includes('crew') || lower.includes('muster')) {
    return {
      icon: Users,
      accent: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    };
  }
  if (lower.includes('supply') || lower.includes('logistics') || lower.includes('fuel') || lower.includes('reserve')) {
    return {
      icon: Fuel,
      accent: 'border-l-amber-500 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    };
  }
  if (lower.includes('directive') || lower.includes('commander') || lower.includes('emergency') || lower.includes('action')) {
    return {
      icon: ShieldAlert,
      accent: 'border-l-rose-500 text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    };
  }
  return {
    icon: Activity,
    accent: 'border-l-slate-400 text-slate-700 dark:text-slate-300',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  };
}

// Parses bullet points like "- **Key:** Value" into structured key-value chips
function renderBulletLine(text, idx) {
  // Check for "- **Key:** Value" pattern
  const kvMatch = text.match(/^[-*•]\s+\*\*([^*:]+)(?::)?\*\*(?::)?\s*(.*)$/);
  if (kvMatch) {
    const key = kvMatch[1].trim();
    const value = kvMatch[2].trim();
    return (
      <div key={`kv-${idx}`} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-slate-100/80 dark:border-slate-800/60 last:border-0">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 sm:w-36">
          {key}
        </span>
        <span className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 flex-1">
          {formatInlineText(value)}
        </span>
      </div>
    );
  }

  // Standard bullet
  const clean = text.replace(/^[-*•]\s+/, '');
  return (
    <div key={`b-${idx}`} className="flex items-start gap-2.5 py-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 shadow-xs shadow-cyan-500/50" />
      <div className="flex-1">{formatInlineText(clean)}</div>
    </div>
  );
}

export default function MarkdownContent({ content = '', className = '' }) {
  if (!content) return null;

  // Split into sections by header (### or ##)
  const lines = content.split('\n');
  const sections = [];
  let currentHeader = null;
  let currentLines = [];

  const flushSection = () => {
    if (currentHeader !== null || currentLines.length > 0) {
      sections.push({ header: currentHeader, lines: currentLines });
      currentHeader = null;
      currentLines = [];
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushSection();
      currentHeader = trimmed.replace(/^#{2,3}\s*/, '');
    } else {
      currentLines.push(line);
    }
  });
  flushSection();

  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((sec, secIdx) => {
        // If there's no header (e.g. initial doc title and subtitle)
        if (!sec.header) {
          // Check if lines contain document title
          const nonEmpty = sec.lines.map(l => l.trim()).filter(Boolean);
          if (nonEmpty.length === 0) return null;

          return (
            <div key={`header-masthead-${secIdx}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111a2e] p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300">
                    <FileText size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wide uppercase text-slate-900 dark:text-white">
                      {nonEmpty[0]?.replace(/\*\*/g, '').replace(/---/g, '') || 'Official Polar Mission SITREP'}
                    </h2>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      National Centre for Polar & Ocean Research · Ministry of Earth Sciences
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 tracking-wider">
                    SITREP-24H
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    CONFIDENTIAL
                  </span>
                </div>
              </div>

              {/* Sub-lines (Station, Report Time, etc) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs">
                {nonEmpty.slice(1).map((sub, i) => {
                  const cleaned = sub.replace(/^[-*•\s]+/, '').replace(/\*/g, '');
                  if (!cleaned || cleaned === '---') return null;
                  return (
                    <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span>{cleaned}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Standard Section with Card Styling
        const theme = getSectionTheme(sec.header);
        const SectionIcon = theme.icon;

        // Process lines in this section (tables, lists, paragraphs)
        const tableRows = [];
        const contentNodes = [];
        let inTable = false;

        const flushTable = (k) => {
          if (tableRows.length > 0) {
            const headerRow = tableRows[0];
            const dataRows = tableRows.slice(1).filter(r => !r.every(c => /^[-:\s]+$/.test(c)));
            contentNodes.push(
              <div key={`table-${k}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  {headerRow && (
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                        {headerRow.map((cell, ci) => (
                          <th key={`th-${ci}`} className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200 font-mono text-[11px] uppercase tracking-wider">
                            {formatInlineText(cell)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dataRows.map((row, ri) => (
                      <tr key={`tr-${ri}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {row.map((cell, ci) => (
                          <td key={`td-${ci}`} className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium">
                            {formatInlineText(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            tableRows.length = 0;
            inTable = false;
          }
        };

        sec.lines.forEach((line, idx) => {
          const trimmed = line.trim();

          // Table handling
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            inTable = true;
            const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
            tableRows.push(cells);
            return;
          } else if (inTable) {
            flushTable(idx);
          }

          // Dividers
          if (/^[-*_]{3,}$/.test(trimmed)) {
            contentNodes.push(<hr key={`hr-${idx}`} className="my-2 border-slate-100 dark:border-slate-800" />);
            return;
          }

          // Bullet points
          if (/^[-*•]\s+/.test(trimmed)) {
            contentNodes.push(renderBulletLine(trimmed, idx));
            return;
          }

          // Numbered list
          if (/^\d+\.\s+/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (match) {
              contentNodes.push(
                <div key={`ol-${idx}`} className="my-1.5 flex items-start gap-2.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 font-mono border border-cyan-200 dark:border-cyan-800">
                    {match[1]}
                  </span>
                  <div className="flex-1 pt-0.5">{formatInlineText(match[2])}</div>
                </div>
              );
              return;
            }
          }

          // Empty line
          if (trimmed === '') {
            contentNodes.push(<div key={`sp-${idx}`} className="h-1" />);
            return;
          }

          // Normal line
          contentNodes.push(
            <p key={`p-${idx}`} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 py-0.5">
              {formatInlineText(line)}
            </p>
          );
        });
        flushTable(sec.lines.length);

        return (
          <div
            key={`sec-${secIdx}`}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs hover:shadow-md transition-shadow overflow-hidden"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5 bg-slate-50/70 dark:bg-[#0d1424]/70">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`p-1.5 rounded-lg border ${theme.badgeBg}`}>
                  <SectionIcon size={14} />
                </span>
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white truncate">
                  {sec.header}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 font-semibold">
                SEC 0{secIdx}
              </span>
            </div>

            {/* Section Content */}
            <div className="p-4 sm:p-4.5 space-y-1">
              {contentNodes}
            </div>
          </div>
        );
      })}

      {/* Official Bottom Dispatch Sign-off Seal */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span>OFFICIALLY COMPILED · POLARIS MISSION DISPATCH CORE v2.5</span>
        </div>
        <div className="text-right">
          <span>AUTHENTICATED DISPATCH // GOVT OF INDIA</span>
        </div>
      </div>
    </div>
  );
}
