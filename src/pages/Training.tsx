import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, CircleCheck, Clock3, Dumbbell, Eye, FileText, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { Avatar, Badge, EmptyState, Field, Modal, PageHeader } from '../components/ui';
import { scopedMembers, shortDate, uid } from '../model';
import type { Exercise, TrainingPlan } from '../model';
import { useApp } from '../store';
import './fitness.css';

const exerciseCatalog = ['Goblet squat', 'Dumbbell bench press', 'Seated cable row', 'Plank', 'Bodyweight squat', 'Incline push-up', 'Resistance band row', 'Dead bug', 'Dumbbell Romanian deadlift', 'Dumbbell row', 'Glute bridge', 'Bird dog'];
function templateFor(equipment: string, duration: number): Exercise[] {
  const names = equipment === 'Bodyweight' ? ['Bodyweight squat', 'Incline push-up', 'Glute bridge', 'Bird dog'] : equipment === 'Dumbbells' ? ['Goblet squat', 'Dumbbell bench press', 'Dumbbell row', 'Plank'] : ['Goblet squat', 'Dumbbell bench press', 'Seated cable row', 'Plank'];
  return names.map((name, i) => ({ name, sets: duration === 30 ? 2 : duration === 60 ? 4 : 3, reps: i === 3 && name === 'Plank' ? '30 sec' : '8–12', rest: i === 3 ? 45 : 90 }));
}

export default function Training() {
  const { state, branchId, navigate } = useApp();
  const [tab, setTab] = useState('All plans');
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const closeCreate = useCallback(() => setCreate(false), []);
  const closeReview = useCallback(() => setSelected(null), []);
  const memberIds = new Set(scopedMembers(state, branchId).map(m => m.id));
  const plans = state.trainingPlans.filter(p => memberIds.has(p.memberId));
  const displayed = plans.filter(p => tab === 'All plans' || (tab === 'Needs review' ? p.status !== 'published' : p.status === 'published'));
  const review = state.trainingPlans.find(p => p.id === selected);
  return <div className="fitness-page">
    <PageHeader eyebrow="HUMAN EXPERTISE. A LITTLE EXTRA INTELLIGENCE." title="Better coaching, together." description="Build thoughtful programs, review every detail, and help members find their rhythm." actions={<button className="btn btn-primary" onClick={() => setCreate(true)}><Plus size={17} /> Create a plan</button>} />
    <section className="training-hero"><div><span className="training-hero-label"><Sparkles size={14} /> YOUR COACHING WORKSPACE</span><h2>More time coaching.<br />Less time starting from scratch.</h2><p>Start with structured exercise templates. Make them personal.<br />Keep your trainers in control of every published plan.</p><button className="btn btn-light" onClick={() => setCreate(true)}>Build a training plan <ArrowRight size={16} /></button></div><div className="training-hero-art" aria-hidden="true"><div className="training-orbit orbit-one" /><div className="training-orbit orbit-two" /><div className="training-art-card"><span><ShieldCheck size={18} /> Trainer approved</span><div><Dumbbell size={37} /><i /><i /><i /></div><small>A stronger plan starts with you.</small></div><div className="training-spark"><Sparkles size={24} /></div></div></section>
    <div className="training-stats"><div className="card"><span className="training-stat-icon"><BookOpen size={20} /></span><div><strong>{plans.length}</strong><span>personalized plans</span></div></div><div className="card"><span className="training-stat-icon amber"><Eye size={20} /></span><div><strong>{plans.filter(p => p.status !== 'published').length}</strong><span>waiting for your review</span></div></div><div className="card"><span className="training-stat-icon"><CircleCheck size={20} /></span><div><strong>{plans.filter(p => p.status === 'published').length}</strong><span>published & ready to go</span></div></div></div>
    <div className="training-workspace"><section className="card training-plans"><div className="section-title"><div><h2>Training plans</h2><p>Good structure. Individual attention.</p></div><Badge tone="green">Trainer-led</Badge></div><div className="tabs">{['All plans', 'Needs review', 'Published'].map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>{t}{t === 'Needs review' && <span className="tab-count">{plans.filter(p => p.status !== 'published').length}</span>}</button>)}</div><div className="training-plan-list">{displayed.map(plan => { const member = state.members.find(m => m.id === plan.memberId); return <button className="training-plan-row" key={plan.id} onClick={() => setSelected(plan.id)}><div className={`plan-document ${plan.status === 'published' ? 'published' : ''}`}><FileText size={23} /></div><div className="training-plan-name"><strong>{plan.title}</strong><span>{member?.name} <i>·</i> {plan.duration} min <i>·</i> {plan.exercises.length} exercises</span></div><div className="training-plan-status"><Badge tone={plan.status === 'published' ? 'green' : plan.status === 'review' ? 'amber' : 'neutral'}>{plan.status === 'published' ? 'Published' : plan.status === 'review' ? 'Needs review' : 'Draft'}</Badge><small>Version {plan.version}</small></div><ChevronRight size={17} /></button>; })}{!displayed.length && <EmptyState icon={<BookOpen size={26} />} title={tab === 'Needs review' ? 'All caught up' : 'The next chapter starts here'} description={tab === 'Needs review' ? 'Every plan in this branch has been reviewed.' : 'Create a tailored plan for a member to get started.'} action={<button className="btn btn-secondary" onClick={() => setCreate(true)}>Create a plan</button>} />}</div></section>
    <aside className="card training-guidelines"><span className="guideline-icon"><ShieldCheck size={23} /></span><h3>A human in every loop.</h3><p>Thoughtful coaching is personal. Our prototype keeps these principles close.</p><ul><li><Check size={15} /> Approved exercise templates</li><li><Check size={15} /> Equipment-aware suggestions</li><li><Check size={15} /> Trainer review before publishing</li><li><Check size={15} /> Versioned plans, preserved history</li></ul><div className="template-label"><Sparkles size={14} /><span>Template-assisted demo<br /><small>No AI model is connected.</small></span></div><button className="text-button" onClick={() => navigate('portal')}>Explore the member experience <ArrowRight size={15} /></button></aside></div>
    {state.workouts.some(w => memberIds.has(w.memberId)) && <section className="card training-session-history"><div className="section-title"><div><h2>Progress, recorded.</h2><p>Completed workouts from your members’ shared journey.</p></div><CircleCheck size={20} /></div>{state.workouts.filter(w => memberIds.has(w.memberId)).slice(0, 8).map(workout => { const member = state.members.find(m => m.id === workout.memberId); const plan = state.trainingPlans.find(p => p.id === workout.planId); return <div className="training-history-row" key={workout.id}><Avatar name={member?.name ?? 'Member'} size="sm" /><div><strong>{member?.name}</strong><span>{plan?.title}</span></div><span>{workout.sets} sets</span><span>Effort {workout.effort}/10</span><span>{shortDate(workout.completedAt)}</span><Badge tone="green">Completed</Badge></div>; })}</section>}
    {create && <CreatePlan onClose={closeCreate} onCreated={id => setSelected(id)} />}
    {review && <ReviewPlan key={review.id} plan={review} onClose={closeReview} onVersionCreated={id => setSelected(id)} />}
  </div>;
}

function CreatePlan({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { state, branchId, dispatch, toast } = useApp();
  const members = scopedMembers(state, branchId);
  const [form, setForm] = useState({ memberId: members[0]?.id ?? '', goal: 'Build strength', equipment: 'Full gym', duration: 45, limitation: 'none', title: '' });
  const submit = (e: FormEvent) => {
    e.preventDefault(); const member = state.members.find(m => m.id === form.memberId); if (!member) return;
    const needsAssessment = form.limitation === 'pain';
    const plan: TrainingPlan = { id: uid('plan'), title: form.title.trim() || (needsAssessment ? 'Trainer assessment requested' : form.goal === 'Build strength' ? 'Your next stronger chapter' : 'Move well, build momentum'), memberId: member.id, trainer: member.trainer, goal: form.goal, status: 'review', duration: form.duration, version: 1, exercises: needsAssessment ? [] : templateFor(form.equipment, form.duration), rationale: needsAssessment ? 'Member reported pain or a limitation. No exercise recommendation has been generated. A qualified trainer must assess the situation and define appropriate constraints before selecting exercises.' : `Structured ${form.duration}-minute template for ${form.goal.toLowerCase()}, using ${form.equipment.toLowerCase()}. Based on the selected goal and available equipment. Trainer review is required before this is visible as a workout.` };
    dispatch({ type: 'SAVE_PLAN', plan }); onClose(); onCreated(plan.id); toast(needsAssessment ? 'Assessment request saved for trainer review.' : 'Template prepared. Review it before publishing.');
  };
  return <Modal title="A plan built around a person" subtitle="Start with a template. Add your coaching expertise." onClose={onClose}>
    <form onSubmit={submit}><div className="form-grid"><Field label="Member"><select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}><option value="" disabled>Select a member</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Training goal"><select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })}>{['Build strength', 'Improve fitness', 'Build consistency'].map(g => <option key={g}>{g}</option>)}</select></Field><Field label="Available equipment"><select value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })}>{['Full gym', 'Dumbbells', 'Bodyweight'].map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Session length"><select value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })}>{[30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}</select></Field><Field label="Plan name (optional)"><input maxLength={80} placeholder="e.g. A stronger foundation" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field><Field label="Member-reported limitations"><select value={form.limitation} onChange={e => setForm({ ...form, limitation: e.target.value })}><option value="none">None reported</option><option value="pain">Pain or a limitation — needs assessment</option></select></Field></div><div className={`plan-template-note ${form.limitation === 'pain' ? 'assessment-note' : ''}`}><ShieldCheck size={19} /><p>{form.limitation === 'pain' ? 'We will prepare an assessment request without exercises. A qualified trainer should review the member’s limitation before designing a workout.' : 'This uses a deterministic exercise template, not an AI model. Every plan goes to trainer review before publication.'}</p></div><div className="form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!form.memberId}><Sparkles size={16} /> {form.limitation === 'pain' ? 'Request trainer assessment' : 'Prepare draft plan'}</button></div></form>
  </Modal>;
}

function ReviewPlan({ plan, onClose, onVersionCreated }: { plan: TrainingPlan; onClose: () => void; onVersionCreated: (id: string) => void }) {
  const { state, dispatch, toast } = useApp();
  const [editable, setEditable] = useState<TrainingPlan>({ ...plan, exercises: plan.exercises.map(e => ({ ...e })) });
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const member = state.members.find(m => m.id === plan.memberId);
  const readOnly = plan.status === 'published';
  const updateExercise = (index: number, patch: Partial<Exercise>) => setEditable({ ...editable, exercises: editable.exercises.map((e, i) => i === index ? { ...e, ...patch } : e) });
  const save = (publish: boolean) => {
    if (!editable.title.trim()) { setError('Give this plan a name.'); return; }
    if (!Number.isInteger(editable.duration) || editable.duration < 15 || editable.duration > 120) { setError('Choose a session duration between 15 and 120 minutes.'); return; }
    if (editable.exercises.some(e => !e.name || !e.reps.trim() || !Number.isInteger(e.sets) || e.sets < 1 || e.sets > 8 || !Number.isFinite(e.rest) || e.rest < 15 || e.rest > 300)) { setError('Check each exercise: 1–8 sets, a repetition target, and 15–300 seconds rest.'); return; }
    if (publish && (!reviewed || !editable.exercises.length)) { setError('Add exercises and complete the trainer review before publishing.'); return; }
    const next = { ...editable, title: editable.title.trim(), status: 'review' as const };
    dispatch({ type: 'SAVE_PLAN', plan: next });
    if (publish) dispatch({ type: 'PUBLISH_PLAN', id: next.id });
    toast(publish ? 'Trainer-approved plan published to the member portal.' : 'Your draft changes are saved.'); onClose();
  };
  const newVersion = () => {
    const copy: TrainingPlan = { ...plan, id: uid('plan'), version: plan.version + 1, status: 'review', exercises: plan.exercises.map(e => ({ ...e })) };
    dispatch({ type: 'SAVE_PLAN', plan: copy }); onVersionCreated(copy.id); toast('A new draft version is ready. Published history is preserved.');
  };
  return <Modal title={readOnly ? 'A plan ready for progress' : 'Give this plan your expert eye'} subtitle={`${member?.name ?? 'Member'} · Version ${plan.version} · ${plan.trainer}`} onClose={onClose} wide>
    <div className="review-plan-top"><div className="review-member"><Avatar name={member?.name ?? 'Member'} /><div><strong>{member?.name}</strong><span>{plan.goal}</span></div></div><Badge tone={readOnly ? 'green' : 'amber'}>{readOnly ? 'Published' : 'Trainer review'}</Badge></div>
    <div className="plan-rationale"><Sparkles size={18} /><div><strong>Why this plan?</strong><p>{editable.rationale}</p></div></div>
    <div className="review-plan-fields"><Field label="Plan name"><input required maxLength={80} disabled={readOnly} value={editable.title} onChange={e => setEditable({ ...editable, title: e.target.value })} /></Field><Field label="Duration (minutes)"><input type="number" min={15} max={120} disabled={readOnly} value={editable.duration} onChange={e => setEditable({ ...editable, duration: Number(e.target.value) })} /></Field></div>
    <div className="exercise-editor-heading"><h3>The session <span>{editable.exercises.length} exercises</span></h3><span><Clock3 size={14} /> {editable.duration} min</span></div>
    <div className="exercise-editor">{editable.exercises.map((exercise, i) => <div className="exercise-editor-row" key={i}><span className="exercise-sequence">{String(i + 1).padStart(2, '0')}</span><Field label="Exercise"><select disabled={readOnly} value={exercise.name} onChange={e => updateExercise(i, { name: e.target.value })}>{exerciseCatalog.map(name => <option key={name}>{name}</option>)}</select></Field><Field label="Sets"><input aria-label={`Sets for ${exercise.name}`} type="number" min={1} max={8} disabled={readOnly} value={exercise.sets} onChange={e => updateExercise(i, { sets: Number(e.target.value) })} /></Field><Field label="Reps / time"><input aria-label={`Reps for ${exercise.name}`} disabled={readOnly} maxLength={25} value={exercise.reps} onChange={e => updateExercise(i, { reps: e.target.value })} /></Field><Field label="Rest (sec)"><input aria-label={`Rest for ${exercise.name}`} type="number" min={15} max={300} step={15} disabled={readOnly} value={exercise.rest} onChange={e => updateExercise(i, { rest: Number(e.target.value) })} /></Field>{!readOnly && <button className="icon-button" aria-label={`Remove ${exercise.name}`} onClick={() => setEditable({ ...editable, exercises: editable.exercises.filter((_, index) => index !== i) })}><Trash2 size={16} /></button>}</div>)}</div>
    {!editable.exercises.length && <div className="info-note"><ShieldCheck size={17} /> A trainer assessment is needed. No exercises have been recommended automatically.</div>}
    {!readOnly && editable.exercises.length < 8 && <button className="text-button add-exercise" onClick={() => setEditable({ ...editable, exercises: [...editable.exercises, { name: exerciseCatalog[0], sets: 3, reps: '8–12', rest: 90 }] })}><Plus size={16} /> Add an exercise</button>}
    {!readOnly && <label className="trainer-approval"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I have reviewed this member’s goal, equipment, and limitations, and approve this plan as their demo trainer.</span></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions">{readOnly ? <><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={newVersion}><Plus size={16} /> Create next version</button></> : <><button className="btn btn-secondary" onClick={() => save(false)}>Save draft</button><button className="btn btn-primary" disabled={!reviewed || !editable.exercises.length} onClick={() => save(true)}><ShieldCheck size={16} /> Approve & publish</button></>}</div>
  </Modal>;
}
