import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, ArrowUp, Check, CircleHelp, ClipboardCheck, Compass, FileText, ShieldCheck, Sparkles, Users, Wallet, Zap } from 'lucide-react';
import { Avatar, Badge, EmptyState, Modal, PageHeader } from '../components/ui';
import { branchName, DEMO_NOW, DEMO_TODAY, daysBetween, inactiveMembers, money, renewalMembers, scopedMembers, shortDate, uid } from '../model';
import type { Member, Task } from '../model';
import { useApp } from '../store';
import './intelligence.css';

type Intent = 'renewal' | 'inactive' | 'payment' | 'classes' | 'unknown';
interface Answer { id: string; prompt: string; intent: Intent; title: string; summary: string; members: Member[]; amount?: number; tasks: Task[]; scope: string; confirmed?: boolean; consentCount: number; }
const suggestions = [
  { text: 'Who needs a little nudge?', prompt: 'Which members have not visited for 14 days?', icon: Users, description: 'Find members to reconnect with' },
  { text: 'Stay ahead of renewals', prompt: 'Show renewals due in the next seven days', icon: ClipboardCheck, description: 'Turn upcoming renewals into a plan' },
  { text: 'Recover missed revenue', prompt: 'Which payments need a follow-up?', icon: Wallet, description: 'See outstanding payment records' },
  { text: 'Find room to grow', prompt: 'Show upcoming class utilization', icon: Compass, description: 'Understand demand and available space' },
];

export default function Copilot() {
  const { state, branchId, dispatch, toast } = useApp();
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [preview, setPreview] = useState<Answer | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setAnswers([]); setPreview(null); }, [branchId]);
  useEffect(() => { if (answers.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [answers.length]);
  const scope = branchId === 'all' ? 'All branches' : branchName(branchId);
  function ask(prompt: string) {
    const query = prompt.toLowerCase();
    const intent: Intent = /renew|expir/.test(query) ? 'renewal' : /inactiv|not visit|haven.t visit|14 days|reconnect|nudge/.test(query) ? 'inactive' : /payment|revenue|outstanding|failed/.test(query) ? 'payment' : /class|utilization|book|capacity/.test(query) ? 'classes' : 'unknown';
    const scoped = scopedMembers(state, branchId);
    const scopeIds = new Set(scoped.map(m => m.id));
    const outstanding = state.payments.filter(p => scopeIds.has(p.memberId) && (p.status === 'failed' || p.status === 'pending'));
    const members = intent === 'renewal' ? renewalMembers(state, branchId) : intent === 'inactive' ? inactiveMembers(state, branchId) : intent === 'payment' ? scoped.filter(m => outstanding.some(p => p.memberId === m.id)) : [];
    const sessions = state.classes.filter(c => (branchId === 'all' || c.branchId === branchId) && Date.parse(c.startAt) > Date.parse(DEMO_NOW));
    const capacity = sessions.reduce((sum, c) => sum + c.capacity, 0);
    const booked = sessions.reduce((sum, c) => sum + c.bookings.length, 0);
    const amount = outstanding.reduce((sum, p) => sum + p.amount, 0);
    const kind: Task['kind'] = intent === 'renewal' ? 'renewal' : intent === 'payment' ? 'payment' : 'follow-up';
    const taskMembers = members.filter(m => !state.tasks.some(t => t.memberId === m.id && t.kind === kind && !t.done));
    const tasks: Task[] = taskMembers.map(m => ({ id: uid('task'), memberId: m.id, branchId: m.branchId, kind, done: false, createdAt: DEMO_NOW, title: `${intent === 'renewal' ? 'Discuss upcoming renewal with' : intent === 'payment' ? 'Review outstanding payment with' : 'Check in with'} ${m.name}` }));
    const title = intent === 'renewal' ? `${members.length} renewals to get ahead of` : intent === 'inactive' ? `${members.length} members could use a check-in` : intent === 'payment' ? `${money(amount)} needs a closer look` : intent === 'classes' ? `${capacity ? Math.round(booked / capacity * 100) : 0}% of upcoming class places are booked` : 'Let’s start with your gym’s data';
    const summary = intent === 'renewal' ? `These active memberships expire between ${shortDate(DEMO_TODAY)} and 29 Oct, inclusive. A timely conversation helps your team understand each member’s next step.` : intent === 'inactive' ? 'These active members have no recorded visit in at least 14 days. This is an attendance signal, not a churn prediction or health assessment.' : intent === 'payment' ? `${outstanding.length} pending or failed invoice records are outstanding across ${members.length} members. Paid and refunded records are excluded. No payment will be collected here.` : intent === 'classes' ? `${booked} of ${capacity} places are reserved across ${sessions.length} sessions after 10:42 AM on 22 October. This describes current bookings, not attendance or a historical demand forecast.` : 'This prototype can review attendance, upcoming renewals, pending payments, and class utilization. Try one of the suggested questions. It cannot send messages, issue refunds, or answer unrelated questions.';
    setAnswers(current => [...current, { id: uid('answer'), prompt, intent, title, summary, members, amount, tasks, scope, consentCount: members.filter(m => m.consent).length }]);
    setInput('');
  }
  function submit(e: FormEvent) { e.preventDefault(); if (input.trim()) ask(input.trim()); }
  const freshTasks = preview?.tasks.filter(t => !state.tasks.some(v => !v.done && v.kind === t.kind && v.memberId === t.memberId)) ?? [];
  return <div className="intelligence-page">
    <PageHeader title="A little intelligence. A lot of possibility." description="Your operations, understood. Your next step, a little clearer." actions={<Badge tone="purple">Local rules demo</Badge>} />
    <div className="copilot-layout">
      <section className="card copilot-workspace">
        <div className="copilot-workspace-top"><div className="copilot-mark"><Sparkles size={19} /></div><div><strong>Qubit Copilot</strong><span>Your business, connected</span></div><div className="copilot-context"><span className="live-dot" />{scope}</div></div>
        <div className="copilot-conversation" aria-live="polite">
          {answers.length === 0 ? <div className="copilot-welcome"><div className="copilot-orbit"><Sparkles size={33} /></div><span className="eyebrow">MAKE SPACE FOR WHAT MATTERS</span><h2>Good decisions start<br />with a clear picture.</h2><p>Ask about your members, revenue, or schedule.<br />I’ll help you find the next useful step.</p><div className="prompt-grid">{suggestions.map(s => <button key={s.prompt} className="prompt-card" onClick={() => ask(s.prompt)}><s.icon size={19} /><strong>{s.text}</strong><span>{s.description}</span><ArrowRight size={15} /></button>)}</div></div> : answers.map(a => <div className="copilot-turn" key={a.id}><div className="copilot-user-message">{a.prompt}</div><article className="copilot-answer"><div className="answer-avatar"><Sparkles size={17} /></div><div className="answer-body"><div className="answer-heading"><strong>Qubit Copilot</strong><span>Rules-based insight</span></div><h3>{a.title}</h3><p>{a.summary}</p>{a.members.length > 0 && <div className="insight-members">{a.members.map(m => <div key={m.id} className="insight-member"><Avatar name={m.name} size="sm" /><div><strong>{m.name}</strong><span>{branchName(m.branchId)}</span></div><small>{a.intent === 'renewal' ? `Expires ${shortDate(m.expiresAt)}` : a.intent === 'inactive' ? m.lastVisit ? `${daysBetween(DEMO_TODAY, m.lastVisit)} days since visit` : 'No visit recorded' : m.status === 'pending' ? 'Awaiting activation' : 'Payment follow-up'}</small></div>)}</div>}{a.members.length > 0 && <div className="insight-next"><FileText size={16} /><p><strong>A helpful next step</strong>Create internal follow-up tasks for your team. {a.consentCount} of these members allow marketing; outreach would require a separate, consent-checked review.</p></div>}{a.intent !== 'unknown' && <div className="answer-source"><ShieldCheck size={13} /><span>{a.scope} · Sample records as of 22 Oct 2026, 10:42 AM IST</span></div>}{a.tasks.length > 0 && <button className="btn btn-secondary" disabled={a.confirmed} onClick={() => setPreview(a)}>{a.confirmed ? <Check size={16} /> : <ClipboardCheck size={16} />}{a.confirmed ? 'Tasks reviewed and created' : `Preview ${a.tasks.length} follow-up tasks`}</button>}{a.members.length > 0 && a.tasks.length === 0 && <Badge tone="green">Open follow-up tasks already exist</Badge>}</div></article></div>)}
          <div ref={endRef} />
        </div>
        <form className="copilot-composer" onSubmit={submit}><Sparkles size={18} /><input value={input} maxLength={500} onChange={e => setInput(e.target.value)} placeholder="Ask about your gym…" aria-label="Ask Qubit Copilot" /><button className="composer-submit" disabled={!input.trim()} aria-label="Send question"><ArrowUp size={19} /></button></form><div className="copilot-disclaimer"><ShieldCheck size={12} /> Local demo · No external AI calls or messages · Review actions before creating tasks</div>
      </section>
      <aside className="copilot-aside"><div className="card copilot-guide"><div className="aside-icon"><Zap size={20} /></div><h3>Insight to action.<br />You’re in control.</h3><p>Copilot helps spot the opportunity. Your team chooses what happens next.</p><ol><li><span>1</span><div><strong>Ask a question</strong><small>Use your current branch’s records.</small></div></li><li><span>2</span><div><strong>Review the context</strong><small>See the members and the reasoning.</small></div></li><li><span>3</span><div><strong>Approve the next step</strong><small>Create tasks with a clear audit trail.</small></div></li></ol></div><div className="copilot-note"><CircleHelp size={18} /><div><strong>A thoughtful beginning</strong><p>This prototype uses deterministic rules. Live AI, scheduled jobs, and delivery integrations are future production work.</p></div></div></aside>
    </div>
    {preview && <Modal title="Review follow-up tasks" subtitle={`${preview.scope} · Internal tasks only. No messages will be sent.`} onClose={() => setPreview(null)}><div className="approval-note"><ShieldCheck size={18} /><p>You’re approving {freshTasks.length} new tasks. Existing open tasks are excluded to prevent duplicate follow-ups.</p></div>{freshTasks.length ? <div className="approval-list">{freshTasks.map(t => <div key={t.id}><ClipboardCheck size={17} /><span>{t.title}</span></div>)}</div> : <EmptyState title="Your team is already on it" description="An open follow-up task already exists for every member in this group." />}<div className="form-actions"><button className="btn btn-secondary" onClick={() => setPreview(null)}>Cancel</button><button className="btn btn-primary" disabled={freshTasks.length === 0} onClick={() => { dispatch({ type: 'ADD_TASKS', tasks: freshTasks }); setAnswers(current => current.map(a => a.id === preview.id ? { ...a, confirmed: true } : a)); toast(`${freshTasks.length} internal follow-up tasks created. No messages sent.`); setPreview(null); }}>Approve & create {freshTasks.length} tasks</button></div></Modal>}
  </div>;
}
