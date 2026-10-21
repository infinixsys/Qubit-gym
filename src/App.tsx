import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Bell, BookOpen, Building2, CalendarDays, ChevronDown, ChevronRight, CircleHelp, Command, CreditCard, Dumbbell, LayoutDashboard, Menu, Search, Settings2, Sparkles, Users, Workflow, X, Zap } from 'lucide-react';
import { useApp } from './store';
import type { Page } from './model';
import { branches, branchName, shortDate } from './model';
import { Avatar, EmptyState, Modal, SearchInput } from './components/ui';
import Overview from './pages/Overview';
import Members from './pages/Members';
import Schedule from './pages/Schedule';
import Leads from './pages/Leads';
import Billing from './pages/Billing';
import Training from './pages/Training';
import Copilot from './pages/Copilot';
import Automations from './pages/Automations';
import Settings from './pages/Settings';
import Portal from './pages/Portal';

const nav = [
  { page:'overview',label:'Overview',icon:LayoutDashboard },
  { page:'members',label:'Members',icon:Users },
  { page:'schedule',label:'Schedule',icon:CalendarDays },
  { page:'leads',label:'Lead pipeline',icon:Activity },
  { page:'training',label:'Training plans',icon:Dumbbell },
  { page:'billing',label:'Billing & payments',icon:CreditCard },
  { page:'automations',label:'Automations',icon:Workflow },
] as const;
export default function App(){
  const {state,page,navigate,branchId,setBranchId,storageError}=useApp();
  const [mobileNav,setMobileNav]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [notifications,setNotifications]=useState(false);
  const [help,setHelp]=useState(false);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(v=>!v);}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[]);
  const current=nav.find(n=>n.page===page)?.label??({copilot:'Qubit AI',settings:'Settings',portal:'Member experience'} as Record<string,string>)[page];
  const go=(p:Page)=>{navigate(p);setMobileNav(false);setSearchOpen(false);};
  const matches=state.members.filter(m=>(branchId==='all'||m.branchId===branchId)&&`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase())).slice(0,5);
  const pages:Record<Page,React.ReactNode>={overview:<Overview/>,members:<Members/>,schedule:<Schedule/>,leads:<Leads/>,billing:<Billing/>,training:<Training/>,copilot:<Copilot/>,automations:<Automations/>,settings:<Settings/>,portal:<Portal/>};
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();document.getElementById('main-content')?.scrollIntoView({block:'start'});}}>Skip to content</a>
    {mobileNav&&<button className="sidebar-scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`} aria-label="Main navigation">
      <button className="brand" onClick={()=>go('overview')} aria-label="QubitFit home"><span className="brand-mark"><Zap size={25} fill="currentColor" strokeWidth={1.5}/></span><span>qubit<span className="brand-fit">fit</span><small>FITNESS, CONNECTED.</small></span></button>
      <div className="workspace-card"><div className="workspace-logo"><Dumbbell size={19}/></div><div><strong>{state.settings.gymName}</strong><span>Growth workspace <span className="tiny-pro">PRO</span></span></div></div>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav>{nav.map(({page:p,label,icon:Icon})=><button key={p} onClick={()=>go(p)} className={`nav-item ${page===p?'active':''}`} aria-current={page===p?'page':undefined}><Icon size={18}/><span>{label}</span>{p==='leads'&&<span className="nav-count">{state.leads.filter(l=>l.stage!=='won').length}</span>}{p==='overview'&&page===p&&<span className="nav-active-dot"/>}</button>)}
      <div className="nav-label intelligence-label">INTELLIGENCE</div><button onClick={()=>go('copilot')} className={`nav-item ai-nav ${page==='copilot'?'active':''}`} aria-current={page==='copilot'?'page':undefined}><Sparkles size={18}/><span>Qubit AI</span><span className="ai-label">BETA</span></button></nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-ai-card"><div className="sidebar-stars"><Sparkles size={20}/><span className="small-dot"/></div><strong>Your extra set of hands.</strong><p>Less busywork.<br/>More room to grow.</p><button onClick={()=>go('copilot')}>Meet your copilot <ArrowRight size={15}/></button></div>
      <div className="sidebar-bottom"><button className={`nav-item ${page==='settings'?'active':''}`} onClick={()=>go('settings')}><Settings2 size={18}/><span>Settings</span></button><button className="nav-item" onClick={()=>setHelp(true)}><CircleHelp size={18}/><span>Help & getting started</span><ArrowUpRightSmall/></button></div>
      <button className="profile-button" onClick={()=>go('settings')}><Avatar name={`${state.settings.ownerName} Rao`} size="sm"/><span><strong>{state.settings.ownerName} Rao</strong><small>Workspace owner</small></span><ChevronDown size={15}/></button>
    </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu size={21}/></button><span className="breadcrumb-home">Workspace</span><ChevronRight size={14}/><strong>{current}</strong></div><div className="topbar-actions"><button className="global-search-button" onClick={()=>setSearchOpen(true)} aria-label="Search workspace"><Search size={17}/><span>Search anything...</span><kbd><Command size={11}/> K</kbd></button>{page!=='portal'&&<div className="branch-select"><Building2 size={15}/><select aria-label="Branch" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="all">All branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><ChevronDown size={13}/></div>}<div className="topbar-separator"/><button className="notification-button icon-button" onClick={()=>setNotifications(true)} aria-label="Open notifications"><Bell size={19}/>{state.tasks.some(t=>!t.done)&&<span/>}</button><button className="topbar-avatar" aria-label="Open settings" onClick={()=>go('settings')}><Avatar name={`${state.settings.ownerName} Rao`} size="sm"/></button></div></header>
      <main id="main-content" className={`main-content ${page==='portal'?'portal-main':''}`} tabIndex={-1}>{storageError&&<div className="notice notice-warning">Browser storage is unavailable. Changes will last for this session only.</div>}{pages[page]}</main>
      <footer className="app-footer"><span><span className="status-dot"/>You’re in the QubitFit demo <span className="footer-divider">·</span> Sample date: 22 Oct 2026, IST</span><button onClick={()=>go('portal')}>Explore the member experience <ArrowRight size={13}/></button></footer>
    </div>
    {searchOpen&&<Modal title="Find your next move" subtitle="Search members or jump to a workspace." onClose={()=>setSearchOpen(false)}><SearchInput value={search} onChange={setSearch} placeholder="Search members, pages…"/><div className="command-results"><div className="eyebrow">WORKSPACE</div>{[...nav,{page:'copilot' as const,label:'Qubit AI',icon:Sparkles}].filter(n=>n.label.toLowerCase().includes(search.toLowerCase())).map(n=><button key={n.page} onClick={()=>go(n.page)}><n.icon size={17}/><span>{n.label}</span><ArrowRight size={15}/></button>)}{search&&<><div className="eyebrow">MEMBERS</div>{matches.map(m=><button key={m.id} onClick={()=>{sessionStorage.setItem('qubit-member-search',m.name);window.dispatchEvent(new CustomEvent('qubitfit:member-search',{detail:m.name}));go('members');}}><Avatar name={m.name} size="sm"/><span>{m.name}<small>{branchName(m.branchId)}</small></span><ArrowRight size={15}/></button>)}{!matches.length&&<p className="muted">No matching members in this branch.</p>}</>}</div></Modal>}
    {notifications&&<Modal title="Your attention, please" subtitle="Open follow-ups and recent workspace activity." onClose={()=>setNotifications(false)}><div className="notification-list">{state.tasks.filter(t=>!t.done&&(branchId==='all'||t.branchId===branchId)).map(t=><button key={t.id} onClick={()=>{setNotifications(false);go('automations');}}><span className="notification-icon"><Bell size={17}/></span><div><strong>{t.title}</strong><p>{branchName(t.branchId)} · Follow-up task</p></div><ChevronRight size={16}/></button>)}{!state.tasks.filter(t=>!t.done&&(branchId==='all'||t.branchId===branchId)).length&&<EmptyState title="You’re all caught up" description="New follow-up tasks will appear here."/>}<div className="section-title">Recent activity</div>{state.audit.slice(0,4).map(a=><div className="notification-activity" key={a.id}><span className="status-dot"/><div><strong>{a.action}</strong><p>{a.detail}</p><small>{shortDate(a.createdAt)}</small></div></div>)}</div></Modal>}
    {help&&<Modal title="A stronger business starts here" subtitle="Take a quick tour of your connected fitness workspace." onClose={()=>setHelp(false)}><div className="getting-started"><p>This is an interactive prototype with fictional members and local browser storage. Start with a complete workflow:</p>{[{p:'members',title:'01 · Welcome a new member',desc:'Enroll, simulate a payment, and check them in.'},{p:'schedule',title:'02 · Fill the floor',desc:'Book a class, join a waitlist, or manage the roster.'},{p:'copilot',title:'03 · Make the next move',desc:'Find renewals and preview follow-up tasks.'},{p:'portal',title:'04 · Step into a member’s shoes',desc:'Follow a workout and book your next class.'}].map(i=><button key={i.p} onClick={()=>{setHelp(false);go(i.p as Page);}}><BookOpen size={20}/><span><strong>{i.title}</strong><small>{i.desc}</small></span><ArrowRight size={17}/></button>)}<div className="notice">AI suggestions use local rules. Payment, messaging, and hardware integrations are simulated. No external messages or charges are made.</div></div></Modal>}
  </div>;
}
function ArrowUpRightSmall(){return <X size={13} style={{transform:'rotate(45deg)'}}/>;}
