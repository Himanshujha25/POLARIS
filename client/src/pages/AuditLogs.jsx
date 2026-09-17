import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Pill, Spinner, Empty, TableWrap, Th, Td, Field, inputCls, btnGhost } from '../components/ui';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionF, setActionF] = useState('');

  const load = async () => {
    setLoading(true);
    try { setLogs(await api(`/api/v1/audit-logs${actionF ? `?action=${actionF}` : ''}`)); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [actionF]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold sm:text-2xl">Audit Logs</h1>
      <div className="flex gap-2 overflow-x-auto">
        {['', 'create', 'update', 'status_change', 'stock_adjustment', 'transfer', 'assignment', 'emergency_action', 'login', 'acknowledge'].map(a => (
          <button key={a} onClick={() => setActionF(a)} className={`${btnGhost} whitespace-nowrap !px-3 !py-1 text-xs ${actionF === a ? '!border-cyan-500 !text-cyan-600' : ''}`}>
            {a || 'All'}
          </button>
        ))}
      </div>
      <Card className="p-0">
        {logs.length === 0 ? <Empty text="No audit entries yet — actions get logged automatically" /> : (
          <TableWrap>
            <table className="w-full">
              <thead><tr><Th>Time</Th><Th>User</Th><Th>Action</Th><Th>Entity</Th><Th>From → To</Th><Th>Details</Th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td>{new Date(l.createdAt).toLocaleString()}</Td>
                    <Td>{l.username} ({l.role})</Td>
                    <Td><Pill value={l.action} /></Td>
                    <Td>{l.entity}</Td>
                    <Td>{[l.fromValue, l.toValue].filter(Boolean).join(' → ') || '—'}</Td>
                    <Td>{l.details || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
