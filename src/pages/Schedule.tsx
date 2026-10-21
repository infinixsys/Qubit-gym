import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Dumbbell, Flame, LayoutGrid, List, MapPin, Plus, Sparkles, Users, Waves, Wind } from 'lucide-react';
import { Avatar, Badge, EmptyState, Field, Modal, PageHeader, Progress } from '../components/ui';
import { branches, branchName, daysBetween, DEMO_NOW, DEMO_TODAY, isEligible, shortDate, timeLabel, uid } from '../model';
import type { ClassSession, Member } from '../model';
import { useApp } from '../store';
import './fitness.css';

const categories: ClassSession['category'][] = ['Strength', 'Yoga', 'HIIT', 'Pilates', 'Cycling'];
export const categoryIcons = { Strength: Dumbbell, Yoga: Wind, HIIT: Flame, Pilates: Sparkles, Cycling: Waves };
const addDays = (day: string, count: number) => { const date = new Date(day); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); };
const future = (session: ClassSession) => Date.parse(session.startAt) > Date.parse(DEMO_NOW);
function canBook(member: Member, session: ClassSession) {
  return isEligible(member) && member.credits > 0 && daysBetween(member.expiresAt, session.startAt) >= 0 && (member.planId !== 'essential' || member.branchId === session.branchId);
}

export default function Schedule() {
  const { state, branchId, toast } = useApp();
  const [date, setDate] = useState(DEMO_TODAY);
  const [weekStart, setWeekStart] = useState('2026-10-19');
  const [category, setCategory] = useState('All classes');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const closeRoster = useCallback(() => setSelected(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const scoped = state.classes.filter(s => branchId === 'all' || s.branchId === branchId);
  const todayClasses = scoped.filter(s => s.startAt.slice(0, 10) === date);
  const sessions = todayClasses.filter(s => category === 'All classes' || s.category === category).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const booked = todayClasses.reduce((sum, s) => sum + s.bookings.length, 0);
  const capacity = todayClasses.reduce((sum, s) => sum + s.capacity, 0);
  const selectedSession = state.classes.find(s => s.id === selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatRange(new Date(weekStart), new Date(addDays(weekStart, 6)));
  return <div className="fitness-page">
    <PageHeader eyebrow="MAKE ROOM FOR MOVEMENT" title="A little structure. A lot of energy." description="Your classes, coaches, and community. Perfectly in sync." actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={17} /> Schedule a class</button>} />
    <div className="schedule-summary">
      <div><span className="schedule-summary-icon"><CalendarDays size={20} /></span><div><strong>{todayClasses.length}</strong><span>classes scheduled</span></div></div>
      <div><span className="schedule-summary-icon"><Users size={20} /></span><div><strong>{booked}</strong><span>reserved spots</span></div></div>
      <div><span className="schedule-summary-icon"><Sparkles size={20} /></span><div><strong>{capacity ? Math.round(booked / capacity * 100) : 0}%</strong><span>class utilization</span></div></div>
      <p><span className="live-dot" /> {shortDate(date)} · Asia/Kolkata</p>
    </div>
    <section className="card schedule-board">
      <div className="schedule-topline"><div><h2>Class timetable</h2><p>Make every session count.</p></div><div className="week-controls"><button className="icon-button" aria-label="Previous week" onClick={() => { const next = addDays(weekStart, -7); setWeekStart(next); setDate(next); }}><ArrowLeft size={16} /></button><span>{weekLabel}</span><button className="icon-button" aria-label="Next week" onClick={() => { const next = addDays(weekStart, 7); setWeekStart(next); setDate(next); }}><ArrowRight size={16} /></button><button className="btn btn-secondary btn-small" onClick={() => { setWeekStart('2026-10-19'); setDate(DEMO_TODAY); }}>Today</button></div></div>
      <div className="week-strip">{week.map(day => <button key={day} className={`week-day ${day === date ? 'selected' : ''} ${day === DEMO_TODAY ? 'is-today' : ''}`} onClick={() => setDate(day)}><span>{new Date(day).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}</span><strong>{Number(day.slice(-2))}</strong><i />{scoped.filter(s => s.startAt.slice(0, 10) === day).length > 0 && <small>{scoped.filter(s => s.startAt.slice(0, 10) === day).length} classes</small>}</button>)}</div>
      <div className="schedule-filters"><div className="class-filter-chips">{['All classes', ...categories].map(c => <button key={c} className={`filter-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="view-switch"><button className={view === 'grid' ? 'active' : ''} aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button><button className={view === 'list' ? 'active' : ''} aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button></div></div>
      {sessions.length ? <div className={`session-grid ${view === 'list' ? 'session-list' : ''}`}>{sessions.map(session => {
        const Icon = categoryIcons[session.category]; const ended = !future(session); const elapsed = Date.parse(session.startAt) + session.duration * 60000 <= Date.parse(DEMO_NOW); const full = session.bookings.length >= session.capacity;
        return <button key={session.id} className={`session-card session-${session.category.toLowerCase()} ${ended ? 'session-past' : ''}`} onClick={() => setSelected(session.id)}>
          <div className="session-card-top"><span className="session-category"><Icon size={15} /> {session.category}</span><span className="session-time">{timeLabel(session.startAt)}</span></div>
          <h3>{session.title}</h3><div className="session-meta"><span><Clock3 size={13} /> {session.duration} min</span><span><MapPin size={13} /> {session.room}</span></div>
          <div className="session-trainer"><Avatar name={session.instructor} size="sm" /><span>{session.instructor}<small>{branchName(session.branchId)}</small></span></div>
          <div className="session-occupancy"><span>{session.bookings.length}<small> / {session.capacity} booked</small></span>{ended ? <Badge tone={elapsed ? 'neutral' : 'blue'}>{elapsed ? 'Elapsed' : 'In progress'}</Badge> : full ? <Badge tone="amber">Waitlist open</Badge> : <span className="available-spots">{session.capacity - session.bookings.length} spots left</span>}</div>
          <Progress value={session.bookings.length / session.capacity * 100} /><div className="session-card-footer"><span>View class & roster</span><ChevronRight size={15} /></div>
        </button>;
      })}</div> : <EmptyState icon={<CalendarDays size={26} />} title="A little room in the schedule" description="No classes match this day and filter. Try another day, or bring a new session to life." action={<button className="btn btn-secondary" onClick={() => setAddOpen(true)}><Plus size={16} /> Schedule a class</button>} />}
      <div className="schedule-note"><Clock3 size={14} /> All class times are in India Standard Time. The demo clock is 22 October 2026, 10:42 AM.</div>
    </section>
    {selectedSession && <Roster session={selectedSession} onClose={closeRoster} />}
    {addOpen && <NewClass defaultDate={date < DEMO_TODAY ? DEMO_TODAY : date} onClose={closeAdd} onCreated={(day) => { setDate(day); const d = new Date(day); const weekday = (d.getUTCDay() + 6) % 7; setWeekStart(addDays(day, -weekday)); toast('Class added to the timetable.'); }} />}
  </div>;
}

function Roster({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const { state, dispatch, toast } = useApp();
  const [memberId, setMemberId] = useState('');
  const [cancelId, setCancelId] = useState('');
  const full = session.bookings.length >= session.capacity;
  const available = state.members.filter(m => canBook(m, session) && !session.bookings.includes(m.id) && !session.waitlist.includes(m.id));
  const canManage = future(session);
  const book = () => {
    const member = state.members.find(m => m.id === memberId);
    if (!member || !canBook(member, session) || !canManage) return;
    dispatch({ type: 'BOOK_CLASS', sessionId: session.id, memberId }); setMemberId('');
    toast(full ? `${member.name} joined the waitlist. No credit used.` : `${member.name} booked. One class credit used.`);
  };
  const cancel = () => {
    const isBooked = session.bookings.includes(cancelId);
    dispatch({ type: 'CANCEL_BOOKING', sessionId: session.id, memberId: cancelId }); setCancelId('');
    toast(isBooked ? 'Booking cancelled and class credit restored.' : 'Removed from the waitlist.');
  };
  return <Modal title={session.title} subtitle={`${shortDate(session.startAt)} · ${timeLabel(session.startAt)} · ${session.duration} minutes`} onClose={onClose} wide>
    <div className="roster-session-info"><Avatar name={session.instructor} /><div><strong>{session.instructor}</strong><p>{branchName(session.branchId)} · {session.room}</p></div><Badge tone={full ? 'amber' : 'green'}>{session.bookings.length} / {session.capacity} booked</Badge></div>
    {!canManage && <div className="info-note">This class has already started. Its roster is available for review.</div>}
    {canManage && <div className="roster-book"><Field label={full ? 'Add a member to the waitlist' : 'Book a member into this class'} hint="Active membership, branch access, and a class credit are required. Waitlisting does not use a credit."><select value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">Select an eligible member</option>{available.map(m => <option key={m.id} value={m.id}>{m.name} · {m.credits} credits</option>)}</select></Field><button className="btn btn-primary" disabled={!memberId} onClick={book}>{full ? 'Join waitlist' : 'Confirm booking'}</button></div>}
    <div className="roster-columns"><div><h3>Reserved <span>{session.bookings.length}</span></h3>{session.bookings.length === 0 && <p className="muted">The first spot is waiting.</p>}{session.bookings.map(id => { const m = state.members.find(m => m.id === id); return m && <div className="roster-person" key={id}><Avatar name={m.name} size="sm" /><span>{m.name}<small>{m.email}</small></span>{canManage ? <button className="text-button" onClick={() => setCancelId(id)} aria-label={`Cancel booking for ${m.name}`}>Cancel</button> : <Check size={15} className="muted" />}</div>; })}</div><div><h3>Waitlist <span>{session.waitlist.length}</span></h3>{session.waitlist.length === 0 && <div className="waitlist-empty"><Users size={24} /><p>No one waiting just yet.</p><small>Eligible members move up automatically when a spot opens.</small></div>}{session.waitlist.map((id, i) => { const m = state.members.find(m => m.id === id); return m && <div className="roster-person" key={id}><span className="waitlist-number">{i + 1}</span><span>{m.name}<small>Waiting for a spot</small></span>{canManage && <button className="text-button" onClick={() => setCancelId(id)}>Remove</button>}</div>; })}</div></div>
    {cancelId && <div className="cancel-confirm"><strong>Cancel {state.members.find(m => m.id === cancelId)?.name}’s {session.bookings.includes(cancelId) ? 'booking' : 'waitlist entry'}?</strong><p>{session.bookings.includes(cancelId) ? 'Their class credit will be restored. The next eligible waitlisted member will be promoted.' : 'No class credits will be changed.'}</p><div><button className="btn btn-secondary" onClick={() => setCancelId('')}>Keep reservation</button><button className="btn btn-danger" onClick={cancel}>Confirm cancellation</button></div></div>}
  </Modal>;
}

function NewClass({ defaultDate, onClose, onCreated }: { defaultDate: string; onClose: () => void; onCreated: (day: string) => void }) {
  const { state, dispatch, branchId } = useApp();
  const [form, setForm] = useState({ title: '', category: 'Strength' as ClassSession['category'], branchId: branchId === 'all' ? branches[0].id : branchId, instructor: 'Arjun Nair', room: 'Training floor', date: defaultDate, time: '17:30', duration: 45, capacity: 12 });
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault(); const startAt = `${form.date}T${form.time}:00+05:30`; const start = Date.parse(startAt); const end = start + form.duration * 60000;
    if (!form.title.trim() || !form.room.trim() || !form.instructor.trim()) { setError('Please fill in the class name, coach, and room.'); return; }
    if (start <= Date.parse(DEMO_NOW)) { setError('Choose a time after the demo clock: 22 October, 10:42 AM.'); return; }
    if (state.classes.some(s => (s.instructor === form.instructor || (s.branchId === form.branchId && s.room.toLowerCase() === form.room.trim().toLowerCase())) && start < Date.parse(s.startAt) + s.duration * 60000 && end > Date.parse(s.startAt))) { setError('This coach or room already has an overlapping class. Choose another time, room, or coach.'); return; }
    dispatch({ type: 'ADD_CLASS', session: { id: uid('class'), title: form.title.trim(), category: form.category, branchId: form.branchId, instructor: form.instructor, room: form.room.trim(), startAt, duration: form.duration, capacity: form.capacity, bookings: [], waitlist: [] } });
    onCreated(form.date); onClose();
  };
  return <Modal title="Make space for a new class" subtitle="A session your members can look forward to." onClose={onClose}>
    <form onSubmit={submit}><div className="form-grid"><Field label="Class name"><input required maxLength={70} placeholder="e.g. Full-body foundations" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field><Field label="Class type"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ClassSession['category'] })}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Branch"><select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>{branches.filter(b => branchId === 'all' || b.id === branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Coach"><select value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })}>{['Arjun Nair', 'Sarah Fernandes', 'Rohit Kumar', 'Neha Reddy'].map(n => <option key={n}>{n}</option>)}</select></Field><Field label="Date"><input type="date" min={DEMO_TODAY} required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field><Field label="Start time (IST)"><input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field><Field label="Duration (minutes)"><input type="number" required min={15} max={180} step={5} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></Field><Field label="Capacity"><input type="number" required min={1} max={80} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></Field><Field label="Room / studio"><input required maxLength={50} value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></Field></div>{error && <p role="alert" className="form-error">{error}</p>}<div className="form-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit"><Plus size={16} /> Add to timetable</button></div></form>
  </Modal>;
}
