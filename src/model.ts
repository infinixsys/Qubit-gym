export const DEMO_TODAY = '2026-10-22';
export const DEMO_NOW = '2026-10-22T10:42:00+05:30';
export const STORAGE_KEY = 'qubitfit-demo-v1';
export type Page = 'overview' | 'members' | 'schedule' | 'leads' | 'billing' | 'training' | 'copilot' | 'automations' | 'settings' | 'portal';
export type MemberStatus = 'active' | 'pending' | 'frozen' | 'expired';
export type LeadStage = 'new' | 'contacted' | 'trial' | 'won';
export interface Branch { id: string; name: string; short: string; address: string }
export interface Plan { id: string; name: string; amount: number; description: string; credits: number }
export interface Member {
  id: string; name: string; email: string; phone: string; branchId: string; planId: string;
  status: MemberStatus; joinedAt: string; expiresAt: string; lastVisit: string | null;
  consent: boolean; credits: number; goal: string; trainer: string; visits: number; sourceLeadId?: string;
}
export interface ClassSession {
  id: string; title: string; category: 'Strength' | 'Yoga' | 'HIIT' | 'Pilates' | 'Cycling';
  branchId: string; instructor: string; room: string; startAt: string; duration: number;
  capacity: number; bookings: string[]; waitlist: string[];
}
export interface Lead {
  id: string; name: string; email: string; phone: string; branchId: string; stage: LeadStage;
  source: string; owner: string; value: number; createdAt: string; note: string; consent: boolean; memberId?: string;
}
export interface Payment {
  id: string; memberId: string; invoiceNumber: string; amount: number; status: 'paid' | 'pending' | 'failed' | 'refunded';
  method: 'UPI' | 'Card' | 'Cash'; createdAt: string; description: string; purpose?: 'enrollment' | 'renewal';
}
export interface Task { id: string; title: string; memberId?: string; branchId: string; done: boolean; kind: 'renewal' | 'payment' | 'follow-up'; createdAt: string }
export interface AuditEvent { id: string; action: string; detail: string; createdAt: string; actor: string }
export interface Automation { id: string; title: string; description: string; trigger: string; enabled: boolean; runs: number; category: string }
export interface Exercise { name: string; sets: number; reps: string; rest: number }
export interface TrainingPlan { id: string; title: string; memberId: string; trainer: string; goal: string; status: 'draft' | 'review' | 'published'; exercises: Exercise[]; duration: number; rationale: string; version: number }
export interface WorkoutLog { id: string; memberId: string; planId: string; completedAt: string; sets: number; effort: number }
export interface AppState {
  version: 1; members: Member[]; classes: ClassSession[]; leads: Lead[]; payments: Payment[];
  tasks: Task[]; audit: AuditEvent[]; automations: Automation[]; trainingPlans: TrainingPlan[]; workouts: WorkoutLog[];
  settings: { gymName: string; ownerName: string; email: string; renewalReminders: boolean; weeklyDigest: boolean };
}
export type Action =
  | { type: 'ADD_MEMBER'; member: Member; payment: Payment }
  | { type: 'UPDATE_MEMBER'; id: string; patch: Partial<Pick<Member, 'status' | 'consent' | 'trainer' | 'goal'>> }
  | { type: 'CHECK_IN'; memberId: string }
  | { type: 'RECORD_PAYMENT'; paymentId: string }
  | { type: 'RENEW_MEMBER'; memberId: string; payment: Payment }
  | { type: 'BOOK_CLASS'; sessionId: string; memberId: string }
  | { type: 'CANCEL_BOOKING'; sessionId: string; memberId: string }
  | { type: 'ADD_CLASS'; session: ClassSession }
  | { type: 'ADD_LEAD'; lead: Lead }
  | { type: 'UPDATE_LEAD'; id: string; patch: Partial<Pick<Lead, 'stage' | 'note' | 'owner' | 'memberId'>> }
  | { type: 'ADD_TASKS'; tasks: Task[] }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'TOGGLE_AUTOMATION'; id: string }
  | { type: 'RUN_AUTOMATION'; id: string; tasks: Task[] }
  | { type: 'SAVE_PLAN'; plan: TrainingPlan }
  | { type: 'PUBLISH_PLAN'; id: string }
  | { type: 'COMPLETE_WORKOUT'; log: WorkoutLog }
  | { type: 'UPDATE_SETTINGS'; settings: AppState['settings'] }
  | { type: 'RESET' };

export const branches: Branch[] = [
  { id: 'koramangala', name: 'Koramangala', short: 'KOR', address: '80 Feet Road, Bengaluru' },
  { id: 'indiranagar', name: 'Indiranagar', short: 'IND', address: '100 Feet Road, Bengaluru' },
  { id: 'whitefield', name: 'Whitefield', short: 'WHT', address: 'ITPL Main Road, Bengaluru' },
];
export const plans: Plan[] = [
  { id: 'essential', name: 'Essential', amount: 249900, description: 'Gym access · 8 classes / month', credits: 8 },
  { id: 'plus', name: 'Performance', amount: 399900, description: 'All branches · 16 classes / month', credits: 16 },
  { id: 'elite', name: 'Unlimited', amount: 599900, description: 'All branches · 30 classes + coaching', credits: 30 },
];
export const money = (paise: number, compact = false) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, ...(compact ? { notation: 'compact' as const } : {}) }).format(paise / 100);
export const shortDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
export const timeLabel = (value: string) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
export const daysBetween = (a: string, b = DEMO_TODAY) => Math.floor((Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86400000);
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('');
export const planFor = (id: string) => plans.find(p => p.id === id)!;
export const branchName = (id: string) => branches.find(b => b.id === id)?.name ?? id;
export const isEligible = (m: Member) => m.status === 'active' && daysBetween(m.expiresAt) >= 0;
export function scopedMembers(state: AppState, branchId: string) { return state.members.filter(m => branchId === 'all' || m.branchId === branchId); }
export function renewalMembers(state: AppState, branchId: string) { return scopedMembers(state, branchId).filter(m => m.status === 'active' && daysBetween(m.expiresAt) >= 0 && daysBetween(m.expiresAt) <= 7); }
export function inactiveMembers(state: AppState, branchId: string) { return scopedMembers(state, branchId).filter(m => m.status === 'active' && (!m.lastVisit || daysBetween(DEMO_TODAY, m.lastVisit) >= 14)); }

const names = ['Aarav Sharma','Priya Menon','Rohan Mehta','Ananya Rao','Vikram Singh','Isha Patel','Kabir Sethi','Diya Nair','Arjun Reddy','Sneha Kapoor','Aditya Joshi','Meera Iyer','Rahul Verma','Nisha Desai','Karan Malhotra','Tara Shah','Dev Khanna','Riya Bhat','Siddharth Das','Aisha Khan','Vivaan Gupta','Kavya Pillai','Neel Arora','Sara Thomas','Dhruv Saxena','Avni Jain','Yash Kulkarni','Sana Ali','Om Prakash','Myra Bose','Rehan Ahmed','Siya Chandra','Arnav Sen','Alia Dutta','Ishaan Roy','Navya Goyal'];
export function createSeed(): AppState {
  const members: Member[] = names.map((name, i) => ({
    id: `m-${i+1}`, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, phone: `+91 98${String(41000100 + i).slice(-8)}`,
    branchId: branches[i % 3].id, planId: plans[i % 3].id,
    status: i === 8 || i === 18 || i === 29 ? 'pending' : i === 11 || i === 24 ? 'frozen' : i === 16 || i === 30 ? 'expired' : 'active',
    joinedAt: `2026-0${5 + i % 5}-${String(1 + i % 22).padStart(2,'0')}`,
    expiresAt: i === 16 || i === 30 ? '2026-10-15' : `2026-${i % 4 === 0 ? '10' : '11'}-${String(i % 4 === 0 ? 24 + i % 5 : 1 + i % 22).padStart(2,'0')}`,
    lastVisit: i === 16 || i === 30 ? '2026-10-14T08:00:00+05:30' : i % 5 === 0 ? '2026-10-04T07:30:00+05:30' : i % 4 === 1 ? DEMO_NOW : `2026-10-${String(15 + i % 7).padStart(2,'0')}T08:00:00+05:30`,
    consent: i % 4 !== 0, credits: 4 + i % 5, goal: ['Build strength', 'Improve fitness', 'Build consistency'][i % 3], trainer: ['Arjun Nair', 'Sarah Fernandes', 'Rohit Kumar'][i % 3], visits: 6 + i % 19, ...(i===20?{sourceLeadId:'lead-9'}:{}),
  }));
  const payments: Payment[] = [];
  for (let month = 7; month <= 10; month++) members.forEach((m,i) => {
    if (month === 10 && i > 29) return;
    if (`2026-${String(month).padStart(2,'0')}-${String(1+i%21).padStart(2,'0')}` < m.joinedAt) return;
    payments.push({id:`pay-${month}-${i}`, memberId:m.id, invoiceNumber:`QF-26${month}-${String(i+1).padStart(3,'0')}`, amount:planFor(m.planId).amount, status:month === 10 && m.status === 'pending' ? (i % 2 === 0 ? 'failed' : 'pending') : 'paid', method:['UPI','Card','Cash'][i%3] as Payment['method'], createdAt:`2026-${String(month).padStart(2,'0')}-${String(1 + i % 21).padStart(2,'0')}T10:00:00+05:30`, description:`${planFor(m.planId).name} · Monthly membership`});
  });
  const classDefs: [string,ClassSession['category'],string,string,string,number][] = [
    ['Morning flow','Yoga','Sarah Fernandes','Studio A','06:30',16],['Strength foundations','Strength','Arjun Nair','Training floor','07:30',12],
    ['The HIIT club','HIIT','Rohit Kumar','Studio B','09:00',12],['Pilates & balance','Pilates','Sarah Fernandes','Studio A','11:00',10],
    ['Lunchtime lift','Strength','Arjun Nair','Training floor','13:00',12],['Ride the rhythm','Cycling','Neha Reddy','Cycle studio','17:00',14],
    ['Sunset stretch','Yoga','Sarah Fernandes','Studio A','18:00',16],['After hours HIIT','HIIT','Rohit Kumar','Studio B','19:00',12],
  ];
  const classes: ClassSession[] = [];
  for (let d=19;d<=25;d++) classDefs.forEach((c,i) => {
    const eligible = members.filter(m => m.status === 'active' && m.expiresAt >= `2026-10-${d}` && (m.planId !== 'essential' || m.branchId === branches[i % 3].id));
    classes.push({id:`class-${d}-${i}`,title:c[0],category:c[1],instructor:c[2],room:c[3],branchId:branches[i % 3].id,startAt:`2026-10-${d}T${c[4]}:00+05:30`,duration:i%3===0?60:45,capacity:c[5],bookings:eligible.slice(1,1+(i===2?c[5]:4+i%6)).map(m=>m.id),waitlist:[]});
  });
  return {
    version:1, members, payments, classes,
    leads: ['Sahil Bansal','Anika Shetty','Manav Chopra','Pooja Hegde','Aryan Mishra','Nandini Rao','Raj Patel','Simran Kaur','Vivaan Gupta'].map((name,i)=>({id:`lead-${i+1}`,name,email:`${name.toLowerCase().replace(' ','.')}@example.com`,phone:`+91 98765 ${43210+i}`,branchId:branches[i%3].id,stage:(['new','new','new','contacted','contacted','trial','trial','trial','won'] as LeadStage[])[i],source:['Instagram','Walk-in','Referral','Website'][i%4],owner:['Ananya','Rohan','Ananya'][i%3],value:plans[i%3].amount,createdAt:i===8?'2026-05-18':`2026-10-${18+i%4}`,note:['Interested in evening classes.','Looking for strength training.','Referred by an existing member.'][i%3],consent:i%3!==0,...(i===8?{memberId:'m-21'}:{})})),
    tasks:[{id:'task-1',title:'Discuss renewal with Aarav Sharma',memberId:'m-1',branchId:'koramangala',done:false,kind:'renewal',createdAt:DEMO_NOW},{id:'task-2',title:'Follow up on Arjun’s failed payment',memberId:'m-9',branchId:'whitefield',done:false,kind:'payment',createdAt:DEMO_NOW},{id:'task-3',title:'Confirm Sahil’s trial session',branchId:'koramangala',done:false,kind:'follow-up',createdAt:DEMO_NOW}],
    audit:[{id:'audit-1',action:'Class booked',detail:'Priya Menon joined Morning flow',createdAt:'2026-10-22T10:35:00+05:30',actor:'Member portal'},{id:'audit-2',action:'Member checked in',detail:'Meera Iyer · Indiranagar',createdAt:'2026-10-22T10:28:00+05:30',actor:'Front desk'},{id:'audit-3',action:'Payment received',detail:'Performance membership · UPI',createdAt:'2026-10-22T10:12:00+05:30',actor:'Demo gateway'}],
    automations:[{id:'auto-renewal',title:'A timely renewal nudge',description:'Prepare follow-up tasks when a membership expires in 7 days.',trigger:'Membership expires in 7 days',enabled:true,runs:18,category:'Retention'},{id:'auto-inactive',title:'Bring them back',description:'Create a check-in task after 14 days without a gym visit.',trigger:'No visit for 14 days',enabled:true,runs:12,category:'Engagement'},{id:'auto-payment',title:'Recover missed payments',description:'Give your team a task when a membership payment fails.',trigger:'Payment failed',enabled:false,runs:4,category:'Revenue'}],
    trainingPlans:[{id:'plan-1',title:'Strength, one step at a time',memberId:'m-1',trainer:'Arjun Nair',goal:'Build strength',status:'published',duration:45,version:1,rationale:'A balanced full-body session from a trainer-approved template. Designed for three consistent sessions per week.',exercises:[{name:'Goblet squat',sets:3,reps:'10–12',rest:90},{name:'Dumbbell bench press',sets:3,reps:'8–10',rest:90},{name:'Seated cable row',sets:3,reps:'10–12',rest:60},{name:'Plank',sets:3,reps:'30 sec',rest:45}]},{id:'plan-2',title:'Move well, feel stronger',memberId:'m-2',trainer:'Sarah Fernandes',goal:'Improve fitness',status:'review',duration:35,version:1,rationale:'Lower-impact session with controlled movements. Requires trainer review before publication.',exercises:[{name:'Bodyweight squat',sets:3,reps:'12',rest:60},{name:'Incline push-up',sets:3,reps:'8–10',rest:60},{name:'Resistance band row',sets:3,reps:'12',rest:60},{name:'Dead bug',sets:2,reps:'10 each side',rest:45}]}],
    workouts:[], settings:{gymName:'Elevate Fitness',ownerName:'Ananya',email:'ananya@example.com',renewalReminders:true,weeklyDigest:true},
  };
}

export function reducer(state: AppState, action: Action): AppState {
  if(action.type === 'RESET') return createSeed();
  const event = (s: AppState, title: string, detail: string): AppState => ({...s,audit:[{id:uid('audit'),action:title,detail,createdAt:new Date().toISOString(),actor:'Demo workspace'},...s.audit].slice(0,200)});
  switch(action.type) {
    case 'ADD_MEMBER': {
      if(state.members.some(m=>m.email.toLowerCase()===action.member.email.toLowerCase())) return state;
      if(action.payment.memberId!==action.member.id||state.payments.some(p=>p.id===action.payment.id)) return state;
      const member={...action.member,status:action.payment.status==='paid'?'active' as const:'pending' as const};
      return event({...state,members:[member,...state.members],payments:[{...action.payment,purpose:'enrollment'},...state.payments]},'Member enrolled',`${action.member.name} · Payment ${action.payment.status}`);
    }
    case 'UPDATE_MEMBER': {
      const member=state.members.find(m=>m.id===action.id);if(!member)return state;
      const {status}=action.patch;
      if(status&&status!==member.status&&!((member.status==='active'&&status==='frozen')||(member.status==='frozen'&&status==='active'&&daysBetween(member.expiresAt)>=0)))return state;
      return event({...state,members:state.members.map(m=>m.id===action.id?{...m,...action.patch}:m)},'Member updated',member.name);
    }
    case 'CHECK_IN': {
      const m=state.members.find(m=>m.id===action.memberId);
      if(!m || !isEligible(m) || m.lastVisit?.slice(0,10)===DEMO_TODAY) return state;
      return event({...state,members:state.members.map(m=>m.id===action.memberId?{...m,lastVisit:DEMO_NOW,visits:m.visits+1}:m)},'Member checked in',m.name);
    }
    case 'RECORD_PAYMENT': {
      const p=state.payments.find(p=>p.id===action.paymentId);
      if(!p || p.status==='paid' || p.status==='refunded') return state;
      return event({...state,payments:state.payments.map(v=>v.id===p.id?{...v,status:'paid'}:v),members:state.members.map(m=>{
        if(m.id!==p.memberId)return m;
        if(p.purpose==='renewal') {const base=daysBetween(m.expiresAt)>0?new Date(m.expiresAt):new Date(DEMO_TODAY);base.setUTCDate(base.getUTCDate()+30);return {...m,status:'active',expiresAt:base.toISOString().slice(0,10),credits:planFor(m.planId).credits};}
        return m.status==='pending'?{...m,status:'active'}:m;
      })},'Payment recorded',`${p.invoiceNumber} · ${money(p.amount)} · Simulated payment`);
    }
    case 'RENEW_MEMBER': {
      if(state.payments.some(p=>p.id===action.payment.id)) return state;
      const m=state.members.find(m=>m.id===action.memberId); if(!m) return state;
      const base=daysBetween(m.expiresAt)>0?new Date(m.expiresAt):new Date(DEMO_TODAY);base.setUTCDate(base.getUTCDate()+30);
      return event({...state,members:state.members.map(v=>v.id===m.id?{...v,status:action.payment.status==='paid'?'active':v.status,expiresAt:action.payment.status==='paid'?base.toISOString().slice(0,10):v.expiresAt,credits:action.payment.status==='paid'?planFor(v.planId).credits:v.credits}:v),payments:[{...action.payment,purpose:'renewal'},...state.payments]},'Renewal recorded',`${m.name} · ${action.payment.status}`);
    }
    case 'BOOK_CLASS': {
      const m=state.members.find(m=>m.id===action.memberId), c=state.classes.find(c=>c.id===action.sessionId);
      if(!m||!c||!isEligible(m)||daysBetween(m.expiresAt,c.startAt)<0||m.credits<1||Date.parse(c.startAt)<=Date.parse(DEMO_NOW)||c.bookings.includes(m.id)||c.waitlist.includes(m.id)||(m.planId==='essential'&&m.branchId!==c.branchId)) return state;
      const full=c.bookings.length>=c.capacity;
      return event({...state,classes:state.classes.map(v=>v.id===c.id?{...v,bookings:full?v.bookings:[...v.bookings,m.id],waitlist:full?[...v.waitlist,m.id]:v.waitlist}:v),members:full?state.members:state.members.map(v=>v.id===m.id?{...v,credits:v.credits-1}:v)},full?'Joined waitlist':'Class booked',`${m.name} · ${c.title}`);
    }
    case 'CANCEL_BOOKING': {
      const c=state.classes.find(v=>v.id===action.sessionId);if(!c||Date.parse(c.startAt)<=Date.parse(DEMO_NOW)||(!c.bookings.includes(action.memberId)&&!c.waitlist.includes(action.memberId))) return state;
      const booked=c.bookings.includes(action.memberId);
      const promote=booked?c.waitlist.find(id=>{const m=state.members.find(m=>m.id===id);return m&&isEligible(m)&&daysBetween(m.expiresAt,c.startAt)>=0&&m.credits>0&&(m.planId!=='essential'||m.branchId===c.branchId);}):undefined;
      return event({...state,classes:state.classes.map(v=>v.id===c.id?{...v,bookings:[...v.bookings.filter(id=>id!==action.memberId),...(promote?[promote]:[])],waitlist:v.waitlist.filter(id=>id!==action.memberId&&id!==promote)}:v),members:state.members.map(m=>m.id===action.memberId&&booked?{...m,credits:m.credits+1}:m.id===promote?{...m,credits:m.credits-1}:m)},'Booking cancelled',`${c.title}${promote?' · Waitlisted member promoted':''}`);
    }
    case 'ADD_CLASS': {
      const c=action.session,start=Date.parse(c.startAt),end=start+c.duration*60000;
      if(!c.title.trim()||!Number.isInteger(c.capacity)||c.capacity<1||c.capacity>80||!Number.isFinite(start)||start<=Date.parse(DEMO_NOW)||c.duration<15||c.duration>180||state.classes.some(v=>v.id===c.id||((v.instructor===c.instructor||(v.branchId===c.branchId&&v.room.trim().toLowerCase()===c.room.trim().toLowerCase()))&&start<Date.parse(v.startAt)+v.duration*60000&&end>Date.parse(v.startAt))))return state;
      return event({...state,classes:[...state.classes,c]},'Class scheduled',c.title);
    }
    case 'ADD_LEAD': {
      if(state.leads.some(l=>l.email.toLowerCase()===action.lead.email.toLowerCase())) return state;
      return event({...state,leads:[action.lead,...state.leads]},'Lead added',action.lead.name);
    }
    case 'UPDATE_LEAD': return event({...state,leads:state.leads.map(l=>l.id===action.id?{...l,...action.patch}:l)},'Lead updated',state.leads.find(l=>l.id===action.id)?.name??'');
    case 'ADD_TASKS': {
      const keys=new Set(state.tasks.filter(t=>!t.done).map(t=>`${t.branchId}:${t.memberId??t.title}:${t.kind}`));
      const tasks=action.tasks.filter(t=>{const key=`${t.branchId}:${t.memberId??t.title}:${t.kind}`;if(keys.has(key))return false;keys.add(key);return true;});
      return tasks.length?event({...state,tasks:[...tasks,...state.tasks]},'Tasks created',`${tasks.length} follow-up tasks · No messages sent`):state;
    }
    case 'TOGGLE_TASK': return {...state,tasks:state.tasks.map(t=>t.id===action.id?{...t,done:!t.done}:t)};
    case 'TOGGLE_AUTOMATION': return event({...state,automations:state.automations.map(a=>a.id===action.id?{...a,enabled:!a.enabled}:a)},'Automation updated',state.automations.find(a=>a.id===action.id)?.title??'');
    case 'RUN_AUTOMATION': {
      if(!state.automations.find(a=>a.id===action.id)?.enabled) return state;
      const next=reducer(state,{type:'ADD_TASKS',tasks:action.tasks});
      return event({...next,automations:next.automations.map(a=>a.id===action.id?{...a,runs:a.runs+1}:a)},'Automation ran',state.automations.find(a=>a.id===action.id)?.title??'');
    }
    case 'SAVE_PLAN': return event({...state,trainingPlans:[action.plan,...state.trainingPlans.filter(p=>p.id!==action.plan.id)]},'Training draft saved',action.plan.title);
    case 'PUBLISH_PLAN': {
      const p=state.trainingPlans.find(p=>p.id===action.id);
      if(!p||p.status==='published'||!p.title.trim()||p.duration<15||p.duration>120||!p.exercises.length||p.exercises.some(e=>!e.name.trim()||!e.reps.trim()||!Number.isInteger(e.sets)||e.sets<1||e.sets>10||e.rest<0||e.rest>600))return state;
      return event({...state,trainingPlans:state.trainingPlans.map(p=>p.id===action.id?{...p,status:'published'}:p)},'Training plan published','Reviewed by demo trainer');
    }
    case 'COMPLETE_WORKOUT': {
      const plan=state.trainingPlans.find(p=>p.id===action.log.planId&&p.memberId===action.log.memberId&&p.status==='published');
      if(!plan||action.log.sets!==plan.exercises.reduce((s,e)=>s+e.sets,0)||action.log.effort<1||action.log.effort>10)return state;
      if(state.workouts.some(w=>w.memberId===action.log.memberId&&w.planId===action.log.planId&&w.completedAt.slice(0,10)===action.log.completedAt.slice(0,10))) return state;
      return event({...state,workouts:[action.log,...state.workouts]},'Workout completed',state.members.find(m=>m.id===action.log.memberId)?.name??'');
    }
    case 'UPDATE_SETTINGS': return {...state,settings:action.settings};
  }
}
