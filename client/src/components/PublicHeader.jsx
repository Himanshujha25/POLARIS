import { Link } from 'react-router-dom';
import { Snowflake, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
      <Snowflake className="text-cyan-500" size={24} />
      <p className="font-extrabold tracking-wide text-slate-900 dark:text-white">POLARIS</p>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// Single shared public header: Brand left · center links · actions right
export default function PublicHeader({ center, actions }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0B111E]/90">
      <div className="flex items-center gap-2 px-4 py-3">
        <Brand />
        <div className="flex flex-1 items-center justify-center gap-5">{center}</div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
