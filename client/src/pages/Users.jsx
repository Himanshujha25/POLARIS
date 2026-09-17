import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost } from '../components/ui';

const ROLES = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer', 'InventoryOfficer', 'PersonnelOfficer', 'AssetOfficer', 'EmergencyOfficer'];
const STATIONS = ['Headquarters_Goa', 'Bharati', 'Maitri', 'Himadri'];

export default function Users() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: 'Test@123', fullName: '', role: 'PersonnelOfficer', station: 'Maitri' });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ role: '', station: '', fullName: '' });

  if (user?.role !== 'SuperAdmin') return <Navigate to="/command" replace />;

  const load = async () => {
    setLoading(true);
    try { setList(await api('/api/v1/auth/users')); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/auth/register', { method: 'POST', body: form });
      setShow(false);
      setForm({ username: '', email: '', password: 'Test@123', fullName: '', role: 'PersonnelOfficer', station: 'Maitri' });
      load();
    } catch (err) { setError(err.message); }
  };

  const openUserEdit = (u) => {
    setEditingUser(u._id);
    setUserForm({ role: u.role, station: u.station || '', fullName: u.fullName });
    setError('');
  };

  const saveUserEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/auth/users/${editingUser}`, { method: 'PATCH', body: userForm });
      setEditingUser(null); load();
    } catch (err) { setError(err.message); }
  };

  const toggleActive = async (u) => {
    if (!window.confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.username}?`)) return;
    try {
      await api(`/api/v1/auth/users/${u._id}`, { method: 'PATCH', body: { isActive: !u.isActive } });
      load();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Team & Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create logins per role — then sign in as them to see RBAC in action</p>
        </div>
        <button className={btnPrimary} onClick={() => setShow(true)}>+ Create user</button>
      </div>

      {list.length === 0 && <Empty />}
      <Card className="p-0">
        <TableWrap>
          <table className="w-full">
            <thead><tr><Th>Username</Th><Th>Name</Th><Th>Role</Th><Th>Station</Th><Th>Active</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {list.map(u => (
                <tr key={u._id} className="border-t border-slate-100 dark:border-slate-800">
                  <Td>{u.username}</Td>
                  <Td>{u.fullName}</Td>
                  <Td><Pill value={u.role} /></Td>
                  <Td>{u.station}</Td>
                  <Td>{u.isActive ? 'Yes' : 'No'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => openUserEdit(u)} className={btnGhost + ' !px-2 !py-1 text-xs'}>Edit</button>
                      <button onClick={() => toggleActive(u)} className={btnGhost + ' !px-2 !py-1 text-xs'}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card className="p-4 text-sm">
        <p className="font-bold">What each role can do</p>
        <ul className="mt-1 list-disc pl-5 text-slate-500 dark:text-slate-400">
          <li><b>ExpeditionManager</b> — plan expeditions, requirements, monitor all modules</li>
          <li><b>LogisticsOfficer</b> — cargo, shipments, tracking, receipts</li>
          <li><b>InventoryOfficer</b> — stock, transactions, transfers, depletion</li>
          <li><b>PersonnelOfficer</b> — roster, assignments, movements</li>
          <li><b>AssetOfficer</b> — assets, maintenance, service due</li>
          <li><b>EmergencyOfficer</b> — incidents, responders, timelines, SOS ack</li>
        </ul>
      </Card>

      {show && (
        <Modal title="Create user" onClose={() => setShow(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username"><input className={inputCls} required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></Field>
              <Field label="Full name"><input className={inputCls} required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></Field>
            </div>
            <Field label="Email"><input type="email" className={inputCls} required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password"><input className={inputCls} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Station">
                <select className={inputCls} value={form.station} onChange={e => setForm({ ...form, station: e.target.value })}>
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className={btnPrimary}>Create</button>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal title="Edit user" onClose={() => setEditingUser(null)}>
          <form onSubmit={saveUserEdit} className="flex flex-col gap-3">
            <Field label="Full name"><input className={inputCls} value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select className={inputCls} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Station"><input className={inputCls} value={userForm.station} onChange={e => setUserForm({ ...userForm, station: e.target.value })} /></Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
