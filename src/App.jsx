import React, { useState, useEffect } from 'react';
import { db, hashPassword } from './db';
import logo from './assets/logo.png'; 

import { 
  Users, Calendar, DollarSign, LayoutDashboard, 
  Plus, Search, LogOut, UserCircle, Save, Trash2,
  Activity, CheckCircle2, ShieldCheck, User, Clock, 
  ArrowUpRight, ArrowDownRight, MapPin, Phone, AlertCircle, Edit3, 
  CalendarCheck, X, RefreshCw, ChevronRight, Stethoscope 
} from 'lucide-react';

export default function App() {
  // --- 1. ESTADOS GERAIS E SESSÃO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- 2. ESTADOS DE AUTENTICAÇÃO ---
  const [authMode, setAuthMode] = useState('login'); 
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });

  // --- 3. ESTADOS DO ADMINISTRADOR ---
  const [pacientes, setPacientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [novoPaciente, setNovoPaciente] = useState({ nome: '', cpf: '', email_paciente: '', prontuario: '' });
  const [novaConsulta, setNovaConsulta] = useState({ paciente_id: '', data: '', hora: '', procedimento: 'Consulta Geral' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editandoConsultaId, setEditandoConsultaId] = useState(null);

  // --- 4. ESTADOS DO ODONTOGRAMA ---
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [odontogramaData, setOdontogramaData] = useState([]);

  // --- 5. ESTADOS DO FINANCEIRO ---
  const [transacoes, setTransacoes] = useState([]);
  const [novaTransacao, setNovaTransacao] = useState({ tipo: 'receita', valor: '', categoria: 'Consulta' });

  // --- 6. ESTADOS DO PACIENTE ---
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', endereco: '', alergias: '' });
  const [novoAgendamentoPaciente, setNovoAgendamentoPaciente] = useState({ data: '', hora: '', procedimento: 'Consulta Geral' });
  const [showModalAgendamento, setShowModalAgendamento] = useState(false);
  const [consultaParaRemarcar, setConsultaParaRemarcar] = useState(null);

  // --- 7. CARREGAMENTO INICIAL ---
  useEffect(() => {
    const saved = localStorage.getItem('odonto_session');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.id) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          if (user.role === 'admin') carregarDadosAdmin(user.id);
          else carregarDadosPaciente(user.email, user.id);
        }
      } catch (e) {
        localStorage.removeItem('odonto_session');
      }
    }
  }, []);

  const carregarDadosAdmin = async (userId) => {
    try {
      const pts = await db.pacientes.where({ owner_id: userId }).toArray();
      const ags = await db.agendamentos.toArray();
      const fin = await db.financeiro.where({ owner_id: userId }).toArray();
      setPacientes(pts || []);
      setAgendamentos(ags || []);
      setTransacoes(fin || []);
    } catch (e) { console.error(e); }
  };

  const carregarDadosPaciente = async (email, userId) => {
    try {
      const emailLimpo = email?.toLowerCase().trim();
      const agsUser = await db.agendamentos.where({ email_paciente: emailLimpo }).toArray();
      setAgendamentos(agsUser || []);
      const user = await db.users.get(userId);
      if (user) {
        setPerfilForm({ nome: user.nome || '', telefone: user.telefone || '', endereco: user.endereco || '', alergias: user.alergias || '' });
      }
    } catch (e) { console.error(e); }
  };

  const carregarOdontograma = async (pacienteId) => {
    const data = await db.odontograma.where({ paciente_id: pacienteId }).toArray();
    setOdontogramaData(data || []);
  };

  // --- 8. LÓGICA DE VALIDAÇÃO ---
  const verificarDisponibilidade = async (data, hora, ignoreId = null) => {
    const horaInt = parseInt(hora.split(':')[0]);
    if (horaInt < 6 || horaInt >= 23) return false;
    const d = new Date(data + 'T12:00:00');
    if (d.getDay() === 0 || d.getDay() === 6) return false;
    const agendamentosDoDia = await db.agendamentos.where({ data: data }).toArray();
    const conflito = agendamentosDoDia.find(a => {
      if (a.id === ignoreId) return false;
      const [ah, am] = a.hora.split(':').map(Number);
      const minutosExistentes = ah * 60 + am;
      const [h, m] = hora.split(':').map(Number);
      return Math.abs((h * 60 + m) - minutosExistentes) < 30;
    });
    return !conflito;
  };

  // --- 9. AUTENTICAÇÃO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const hashed = await hashPassword(loginForm.pass);
    const account = await db.users.where({ email: loginForm.email.toLowerCase().trim() }).first();
    if (account && account.password === hashed) {
      setCurrentUser(account); setIsLoggedIn(true);
      localStorage.setItem('odonto_session', JSON.stringify(account));
      if (account.role === 'admin') carregarDadosAdmin(account.id);
      else carregarDadosPaciente(account.email, account.id);
    } else { alert('E-mail ou senha incorretos.'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const emailLimpo = loginForm.email.toLowerCase().trim();
    const userRole = emailLimpo.endsWith('@admin.com') ? 'admin' : 'paciente';
    try {
      await db.users.add({ email: emailLimpo, password: await hashPassword(loginForm.pass), role: userRole });
      alert(`Conta criada!`); setAuthMode('login');
    } catch (err) { alert("E-mail já cadastrado."); }
  };

  const logout = () => { localStorage.clear(); window.location.reload(); };

  // --- 11. RENDERIZAÇÃO DE LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex w-full max-w-5xl h-[600px] bg-[#1E293B] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-700">
          <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#2563EB] p-16 text-white relative overflow-hidden">
            <div className="relative z-10 text-center">
                <img src={logo} alt="OdontoHub Logo" className="w-64 mx-auto mb-8 drop-shadow-2xl" />
                <h1 className="text-4xl font-black italic uppercase tracking-tighter">OdontoHub Pro</h1>
                <p className="mt-4 text-blue-100 font-medium">Gestão clínica inteligente e conectada.</p>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-16 flex flex-col justify-center bg-[#1E293B]">
            <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">{authMode === 'login' ? 'Login' : 'Cadastro'}</h2>
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <input type="email" required placeholder="E-mail Corporativo" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              <input type="password" required placeholder="Senha de Acesso" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg">{authMode === 'login' ? 'Entrar' : 'Registrar'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 text-[10px] text-slate-400 font-black uppercase tracking-widest text-center hover:text-blue-400">{authMode === 'login' ? 'Criar Nova Conta' : 'Voltar ao Login'}</button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex h-screen bg-[#0F172A] font-sans text-white overflow-hidden">
      <aside className="w-72 bg-[#1E293B] flex flex-col border-r border-slate-800 z-20">
        <div className="p-10 flex flex-col items-center gap-4">
            <img src={logo} alt="OdontoHub Logo" className="w-56 h-auto object-contain drop-shadow-lg" />
            <h2 className="text-xl font-black tracking-tighter text-white italic uppercase">Odonto<span className="text-blue-500 not-italic">Hub</span></h2>
        </div>
        <nav className="flex-1 px-6 pt-6 space-y-2">
          {isAdmin ? (
            <>
              <NavItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
              <NavItem active={activeTab === 'pacientes'} icon={<Users size={20}/>} label="Pacientes" onClick={() => setActiveTab('pacientes')} />
              <NavItem active={activeTab === 'agenda'} icon={<Calendar size={20}/>} label="Agenda Médica" onClick={() => setActiveTab('agenda')} />
              <NavItem active={activeTab === 'financeiro'} icon={<DollarSign size={20}/>} label="Financeiro" onClick={() => setActiveTab('financeiro')} />
            </>
          ) : (
            <>
              <NavItem active={activeTab === 'consultas'} icon={<Calendar size={20}/>} label="Minhas Consultas" onClick={() => setActiveTab('consultas')} />
              <NavItem active={activeTab === 'perfil'} icon={<UserCircle size={20}/>} label="Meu Perfil" onClick={() => setActiveTab('perfil')} />
            </>
          )}
        </nav>
        <button onClick={logout} className="p-10 text-red-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-red-300 transition-colors"><LogOut size={16} /> Sair do Sistema</button>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-[#0F172A] relative">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && <DashboardView pacientesCount={pacientes.length} agendamentosCount={agendamentos.length} transacoes={transacoes} />}
            {activeTab === 'pacientes' && !pacienteSelecionado && <PacientesView pacientes={pacientes} novo={novoPaciente} setNovo={setNovoPaciente} save={(e) => { e.preventDefault(); db.pacientes.add({...novoPaciente, owner_id: currentUser.id}).then(() => carregarDadosAdmin(currentUser.id)); setNovoPaciente({nome:'', cpf:'', email_paciente:'', prontuario:''}); }} search={searchTerm} setSearch={setSearchTerm} deletar={(id) => db.pacientes.delete(id).then(() => carregarDadosAdmin(currentUser.id))} onSelect={(p) => { setPacienteSelecionado(p); carregarOdontograma(p.id); }} />}
            {pacienteSelecionado && <OdontogramaDetalhes paciente={pacienteSelecionado} data={odontogramaData} onBack={() => setPacienteSelecionado(null)} onDenteClick={(id, cond) => { db.odontograma.where({ paciente_id: pacienteSelecionado.id, dente_id: id }).delete().then(() => { if (cond !== 'saudavel') db.odontograma.add({ owner_id: currentUser.id, paciente_id: pacienteSelecionado.id, dente_id: id, condicao: cond, data: new Date().toISOString() }); carregarOdontograma(pacienteSelecionado.id); }); }} />}
            {activeTab === 'agenda' && <AgendaView pacientes={pacientes} agendamentos={agendamentos} nova={novaConsulta} setNova={setNovaConsulta} save={(e) => { e.preventDefault(); const p = pacientes.find(px => px.id === parseInt(novaConsulta.paciente_id)); if(editandoConsultaId) db.agendamentos.update(editandoConsultaId, {...novaConsulta, paciente_nome: p?.nome}).then(() => {setEditandoConsultaId(null); carregarDadosAdmin(currentUser.id);}); else db.agendamentos.add({...novaConsulta, owner_id: currentUser.id, paciente_nome: p?.nome}).then(() => carregarDadosAdmin(currentUser.id)); }} editandoId={editandoConsultaId} onEdit={(ag) => { setEditandoConsultaId(ag.id); setNovaConsulta(ag); }} onDelete={(id) => db.agendamentos.delete(id).then(() => carregarDadosAdmin(currentUser.id))} verificar={verificarDisponibilidade} />}
            {activeTab === 'financeiro' && <FinanceiroView transacoes={transacoes} nova={novaTransacao} setNova={setNovaTransacao} save={(e) => { e.preventDefault(); db.financeiro.add({...novaTransacao, valor: parseFloat(novaTransacao.valor), owner_id: currentUser.id, data: new Date().toISOString()}).then(() => carregarDadosAdmin(currentUser.id)); }} />}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {activeTab === 'consultas' && <div className="space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Minhas Consultas</h1>
                    <button onClick={() => {setConsultaParaRemarcar(null); setShowModalAgendamento(true);}} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700">+ Novo Agendamento</button>
                </header>
                <div className="grid gap-4">{agendamentos.map(ag => (
                    <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 flex justify-between items-center shadow-sm group hover:border-blue-500 transition-all">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex flex-col items-center justify-center text-blue-400 font-black border border-blue-800">
                              <span className="text-[10px] uppercase">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', {month: 'short'})}</span>
                              <span className="text-xl">{new Date(ag.data + 'T12:00:00').getDate()}</span>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">{ag.procedimento}</p>
                              <p className="text-xl font-bold text-white">Data: {new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {ag.hora}</p>
                              <p className="text-sm font-medium text-slate-400 mt-1 italic">{ag.procedimento || 'Sem descrição adicional'}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => {setConsultaParaRemarcar(ag); setNovoAgendamentoPaciente({data: ag.data, hora: ag.hora, procedimento: ag.procedimento}); setShowModalAgendamento(true);}} className="bg-[#0F172A] text-slate-300 px-5 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-white hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm"><RefreshCw size={14} /> Remarcar</button>
                          <button onClick={() => { if(confirm("Deseja cancelar?")) db.agendamentos.delete(ag.id).then(() => carregarDadosPaciente(currentUser.email, currentUser.id))} } className="text-red-400 font-black text-[10px] uppercase hover:text-red-300 p-2">Cancelar</button>
                        </div>
                    </div>
                ))}</div>
                {agendamentos.length === 0 && <p className="text-slate-500 italic text-center p-20 border-2 border-dashed border-slate-700 rounded-[3rem]">Sua agenda está vazia.</p>}
             </div>}
             {activeTab === 'perfil' && <PerfilPacienteView form={perfilForm} setForm={setPerfilForm} save={(e) => { e.preventDefault(); db.users.update(currentUser.id, perfilForm).then(() => { setCurrentUser({...currentUser, ...perfilForm}); setEditandoPerfil(false); alert("Sincronizado!"); }); }} editando={editandoPerfil} setEditando={setEditandoPerfil} email={currentUser.email} />}
          </div>
        )}

        {showModalAgendamento && <ModalTimeSlots titulo={consultaParaRemarcar ? 'Remarcar' : 'Novo Agendamento'} form={novoAgendamentoPaciente} setForm={setNovoAgendamentoPaciente} onClose={() => setShowModalAgendamento(false)} onSave={(e) => { e.preventDefault(); if (consultaParaRemarcar) db.agendamentos.delete(consultaParaRemarcar.id); db.agendamentos.add({ ...novoAgendamentoPaciente, paciente_nome: perfilForm.nome || currentUser.email.split('@')[0], email_paciente: currentUser.email.toLowerCase().trim(), owner_id: 'auto' }).then(() => {setShowModalAgendamento(false); carregarDadosPaciente(currentUser.email, currentUser.id);}); }} verificar={verificarDisponibilidade} ignoreId={consultaParaRemarcar?.id} />}
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES ---
function NavItem({ icon, label, active, onClick }) {
    return ( <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${active ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-blue-400 hover:bg-[#0F172A]'}`}>{icon} {label}</button> );
}

function DashboardView({ pacientesCount, agendamentosCount, transacoes }) {
    const rec = transacoes.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
    const des = transacoes.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
    const saldo = rec - des;
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <header><h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Visão Geral</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatsCard label="Pacientes" value={pacientesCount} color="blue" icon={<Users size={24}/>} />
                <StatsCard label="Agenda" value={agendamentosCount} color="purple" icon={<Calendar size={24}/>} />
                <StatsCard label="Saldo" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)} color={saldo >= 0 ? "green" : "red"} icon={<DollarSign size={24}/>} />
            </div>
        </div>
    );
}

function StatsCard({ label, value, color, icon }) {
    const colors = { blue: 'bg-blue-600', purple: 'bg-[#1E293B]', green: 'bg-emerald-600', red: 'bg-red-600' };
    return ( <div className={`${colors[color]} p-10 rounded-[3rem] text-white shadow-xl flex flex-col justify-between h-56 transition-all hover:scale-105 border border-white/10`}><div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md">{icon}</div><div><p className="text-[10px] font-black uppercase opacity-70 mb-1">{label}</p><p className="text-4xl font-black tracking-tighter">{value}</p></div></div> );
}

function PacientesView({ pacientes, novo, setNovo, save, search, setSearch, deletar, onSelect }) {
    return ( <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500"><div className="flex justify-between items-end"><div><h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Pacientes</h1></div><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Buscar..." className="bg-[#1E293B] text-white pl-12 pr-5 py-5 rounded-2xl w-80 shadow-sm border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSearch(e.target.value)} /></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="bg-[#1E293B] p-10 rounded-[3rem] shadow-xl h-fit border border-slate-700"><form onSubmit={save} className="space-y-4 text-xs font-bold tracking-widest uppercase text-slate-400"><input placeholder="Nome" className="w-full p-4 bg-[#0F172A] text-white rounded-xl outline-none border border-slate-600 focus:border-blue-500 transition-all" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} /><input placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl outline-none border border-slate-600 focus:border-blue-500 transition-all" value={novo.cpf} onChange={e => setNovo({...novo, cpf: e.target.value})} /><input placeholder="E-mail" className="w-full p-4 bg-[#0F172A] text-white rounded-xl outline-none border border-slate-600 focus:border-blue-500 transition-all" value={novo.email_paciente} onChange={e => setNovo({...novo, email_paciente: e.target.value})} /><textarea placeholder="Notas" className="w-full p-4 bg-[#0F172A] text-white rounded-xl h-32 border border-slate-600 focus:border-blue-500 transition-all" value={novo.prontuario} onChange={e => setNovo({...novo, prontuario: e.target.value})} /><button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-xl uppercase shadow-xl hover:bg-blue-700 transition-all">Salvar Registro</button></form></div><div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] shadow-xl overflow-hidden border border-slate-700"><table className="w-full text-left"><thead className="bg-[#0F172A] border-b border-slate-700"><tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest"><th className="p-8">Identificação</th><th className="p-8 text-right">Ação</th></tr></thead><tbody>{pacientes.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())).map(p => (<tr key={p.id} onClick={() => onSelect(p)} className="border-b border-slate-700 hover:bg-[#0F172A] cursor-pointer transition-all group"><td className="p-8"><p className="font-black uppercase text-sm text-white">{p.nome}</p><p className="text-[9px] font-black text-slate-500">CPF: {p.cpf || '---'}</p></td><td className="p-8 text-right"><button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) deletar(p.id); }} className="text-slate-600 hover:text-red-400 transition-all"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div></div></div> );
}

function OdontogramaDetalhes({ paciente, data, onBack, onDenteClick }) {
    const sup = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const inf = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
    return ( <div className="space-y-8 animate-in slide-in-from-right-4 duration-500"><button onClick={onBack} className="text-slate-500 font-black uppercase text-[10px] flex items-center gap-2 hover:text-blue-400 transition-all"><ChevronRight className="rotate-180" /> Voltar</button><div className="bg-[#1E293B] p-16 rounded-[4rem] shadow-2xl border border-slate-700"><header className="mb-16 border-b border-slate-700 pb-10"><h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">{paciente.nome}</h1></header><div className="flex flex-col items-center gap-16">{[sup, inf].map((arc, i) => (<div key={i} className="flex gap-2">{arc.map(id => { const r = data.find(d => d.dente_id === id); return <div key={id} onClick={() => onDenteClick(id, prompt("Condição? (carie, canal, extraido)"))} className={`w-10 h-14 border-2 rounded-xl flex items-center justify-center font-black text-[10px] cursor-pointer transition-all ${r?.condicao==='carie'?'bg-red-600 text-white shadow-red-900 border-red-800':r?.condicao==='canal'?'bg-blue-600 text-white shadow-blue-900 border-blue-800':r?.condicao==='extraido'?'bg-slate-700 border-slate-600 opacity-50':'bg-[#0F172A] text-slate-500 border-slate-700 hover:border-blue-500'}`}>{id}</div> })}</div>))}</div></div></div> );
}

function AgendaView({ pacientes, agendamentos, nova, setNova, save, editandoId, onEdit, onDelete, verificar }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => { const load = async () => { if (!nova.data) return; setLoading(true); const s = []; for (let h=6; h<23; h++) { for (let m of ['00','30']) { const t=`${String(h).padStart(2,'0')}:${m}`; const l=await verificar(nova.data, t, editandoId); s.push({h:t, l}); } } setSlots(s); setLoading(false); }; load(); }, [nova.data, editandoId]);
    return ( <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500"><h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Agenda Médica</h1><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="bg-[#1E293B] p-10 rounded-[3rem] shadow-xl h-fit space-y-4 border border-slate-700"><select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}><option value="">Paciente...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select><input type="date" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.data} onChange={e => setNova({...nova, data: e.target.value})} />{nova.data && <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Slots</label>{loading ? <div className="p-4 text-center"><RefreshCw className="animate-spin text-blue-500 mx-auto"/></div> : <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-[#0F172A] rounded-xl border border-slate-700">{slots.map(s => <button key={s.h} disabled={!s.l} onClick={() => setNova({...nova, hora: s.h})} className={`p-2 rounded-lg text-[10px] font-black border-2 transition-all ${!s.l ? 'bg-slate-800 text-slate-600 border-transparent cursor-not-allowed' : nova.hora===s.h ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-[#0F172A] text-blue-400 border-slate-700 hover:border-blue-500'}`}>{s.h}</button>)}</div>}</div>}<input placeholder="Procedimento" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.procedimento} onChange={e => setNova({...nova, procedimento: e.target.value})} /><button onClick={save} className={`w-full ${editandoId ? 'bg-emerald-600' : 'bg-blue-600'} text-white py-5 rounded-xl uppercase font-black shadow-xl hover:opacity-90 transition-all`}>{editandoId ? 'Salvar' : 'Agendar'}</button></div><div className="lg:col-span-2 space-y-4">{agendamentos.map(ag => (
        <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 shadow-sm flex justify-between items-center group transition-all hover:border-blue-500">
            <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {ag.hora}</p><p className="text-xl font-black text-white uppercase">{ag.paciente_nome}</p><p className="text-sm font-bold text-slate-400 mt-1 italic">{ag.procedimento || 'Consulta Geral'}</p></div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => onEdit(ag)} className="w-10 h-10 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={18}/></button><button onClick={() => onDelete(ag.id)} className="w-10 h-10 bg-red-900/30 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button></div></div>))}</div></div></div> );
}

function FinanceiroView({ transacoes, nova, setNova, save }) {
    return ( <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500"><h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Financeiro</h1><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="bg-[#1E293B] p-10 rounded-[3rem] shadow-xl h-fit space-y-4 font-black uppercase text-[10px] text-slate-500 border border-slate-700"><select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.tipo} onChange={e => setNova({...nova, tipo: e.target.value})}><option value="receita">Receita</option><option value="despesa">Despesa</option></select><input type="number" placeholder="Valor R$" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.valor} onChange={e => setNova({...nova, valor: e.target.value})} /><input placeholder="Descrição" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" value={nova.categoria} onChange={e => setNova({...nova, categoria: e.target.value})} /><button onClick={save} className="w-full bg-emerald-600 text-white py-4 rounded-xl uppercase font-black shadow-lg">Lançar no Sistema</button></div><div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] shadow-xl overflow-hidden border border-slate-700"><table className="w-full text-left"><thead className="bg-[#0F172A] border-b border-slate-700"><tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest"><th className="p-8">Lançamento</th><th className="p-8 text-right">Valor</th></tr></thead><tbody>{transacoes.slice().reverse().map(t => (<tr key={t.id} className="border-b border-slate-700 hover:bg-[#0F172A] transition-all group"><td className="p-8"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.tipo==='receita'?'bg-green-900/30 text-green-400':'bg-red-900/30 text-red-400'}`}>{t.tipo==='receita' ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}</div><div><p className="font-black text-white uppercase text-sm">{t.categoria}</p><p className="text-[9px] font-black text-slate-500 tracking-widest">{new Date(t.data).toLocaleDateString()}</p></div></div></td><td className={`p-8 text-right font-black text-lg tracking-tighter ${t.tipo==='receita'?'text-green-400':'text-red-400'}`}>R$ {t.valor.toFixed(2)}</td></tr>))}</tbody></table></div></div></div> );
}

function PerfilPacienteView({ form, setForm, save, editando, setEditando, email }) {
    return ( <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500"><header className="flex justify-between items-end"><div><h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Meu Perfil</h1></div><button onClick={() => setEditando(!editando)} className="bg-[#1E293B] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm border border-slate-700 hover:border-blue-500 transition-all">{editando ? "Cancelar" : "Editar"}</button></header><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="lg:col-span-2 bg-[#1E293B] p-12 rounded-[4rem] shadow-2xl border border-slate-700 space-y-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="ml-1">Nome Social / Legal</label>
          <input disabled={!editando} placeholder="Digite seu nome completo" className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="ml-1">Telefone / WhatsApp</label>
          <input disabled={!editando} placeholder="(00) 00000-0000" className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="ml-1">Endereço Residencial Completo</label>
        <input disabled={!editando} placeholder="Rua, Número, Bairro, Cidade - UF" className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} />
      </div>
      <div className="space-y-2 text-red-400">
        <label className="ml-1">Alergias e Observações Críticas</label>
        <textarea disabled={!editando} rows="4" placeholder="Informe alergias a medicamentos ou condições de saúde importantes" className="w-full p-5 bg-[#0F172A] text-white rounded-3xl border border-slate-700 font-bold focus:border-red-500 outline-none" value={form.alergias} onChange={e => setForm({...form, alergias: e.target.value})} />
      </div>
      {editando && <button onClick={save} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Salvar Registro</button>}</div><div className="bg-[#0F172A] p-12 rounded-[3rem] text-white shadow-xl h-fit border border-slate-800 relative overflow-hidden"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Conta Verificada</p><p className="text-2xl font-black break-all leading-none italic tracking-tighter">{email}</p></div></div></div> );
}

function ModalTimeSlots({ titulo, form, setForm, onClose, onSave, verificar, ignoreId }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => { const load = async () => { if (!form.data) return; setLoading(true); const s = []; for (let h=6; h<23; h++) { for (let m of ['00','30']) { const t=`${String(h).padStart(2,'0')}:${m}`; const l=await verificar(form.data, t, ignoreId); s.push({h:t, l}); } } setSlots(s); setLoading(false); }; load(); }, [form.data]);
    return ( <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"><div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-xl" onClick={onClose}></div><div className="relative bg-[#1E293B] w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 space-y-10 animate-in zoom-in-95 duration-300 border border-slate-700"><div className="flex justify-between items-center"><h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">{titulo}</h3><button onClick={onClose} className="w-12 h-12 bg-[#0F172A] rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all border border-slate-700"><X size={24}/></button></div><div className="grid grid-cols-2 gap-8"><input type="date" className="w-full p-5 bg-[#0F172A] text-white rounded-[2rem] border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.data} onChange={e => setForm({...form, data: e.target.value})} /><select className="w-full p-5 bg-[#0F172A] text-white rounded-[2rem] border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.procedimento} onChange={e => setForm({...form, procedimento: e.target.value})}><option value="Consulta Geral">Consulta Geral</option><option value="Limpeza">Limpeza</option></select></div><div className="space-y-4"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center block">Horários Disponíveis (30min)</label>{loading ? <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-blue-500" /></div> : <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto p-4 bg-[#0F172A] rounded-[2.5rem] border border-slate-700">{slots.map(s => <button key={s.h} disabled={!s.l} onClick={() => setForm({...form, hora: s.h})} className={`p-4 rounded-3xl text-[11px] font-black border-2 transition-all ${!s.l ? 'bg-slate-800 text-slate-600 border-transparent cursor-not-allowed' : form.hora===s.h ? 'bg-blue-600 text-white border-blue-500 shadow-2xl scale-105' : 'bg-[#0F172A] text-blue-400 border-slate-700 hover:border-blue-500'}`}>{s.h}</button>)}</div>}</div><button disabled={!form.hora || !form.data} onClick={onSave} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none transition-all active:scale-[0.98]">Confirmar Agendamento</button></div></div> );
}