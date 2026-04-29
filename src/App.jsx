import React, { useState, useEffect } from 'react';
import { db, hashPassword } from './db';
import { 
  Users, Calendar, DollarSign, LayoutDashboard, 
  Plus, Search, LogOut, UserCircle, Save, Trash2,
  Activity, CheckCircle2, ShieldCheck, User, Clock
} from 'lucide-react';

export default function App() {
  // --- ESTADOS GERAIS ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [authMode, setAuthMode] = useState('login'); 
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });

  // --- ESTADOS DE FUNCIONALIDADES ---
  const [pacientes, setPacientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [novoPaciente, setNovoPaciente] = useState({ nome: '', cpf: '', email_paciente: '', prontuario: '' });
  const [novaConsulta, setNovaConsulta] = useState({ paciente_id: '', data: '', hora: '', procedimento: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // --- NOVOS ESTADOS PARA ODONTOGRAMA ---
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [odontogramaData, setOdontogramaData] = useState([]);

  // --- PERSISTÊNCIA E CARREGAMENTO ---
  useEffect(() => {
    const saved = localStorage.getItem('odonto_session');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setIsLoggedIn(true);
        if (user.role === 'admin') {
          carregarDadosAdmin(user.id);
        } else {
          carregarDadosPaciente(user.email);
        }
      } catch (e) {
        localStorage.removeItem('odonto_session');
      }
    }
  }, []);

  const carregarDadosAdmin = async (userId) => {
    const pts = await db.pacientes.where({ owner_id: userId }).toArray();
    const ags = await db.agendamentos.where({ owner_id: userId }).toArray();
    setPacientes(pts);
    setAgendamentos(ags);
  };

  const carregarDadosPaciente = async (email) => {
    const ags = await db.agendamentos.where({ email_paciente: email.toLowerCase().trim() }).toArray();
    setAgendamentos(ags);
  };

  // --- LÓGICA DE DADOS DO ODONTOGRAMA ---
  const carregarOdontograma = async (pacienteId) => {
    const data = await db.odontograma.where({ paciente_id: pacienteId }).toArray();
    setOdontogramaData(data);
  };

  const atualizarDente = async (denteId, condicao) => {
    if (!pacienteSelecionado) return;
    await db.odontograma.where({ paciente_id: pacienteSelecionado.id, dente_id: denteId }).delete();
    
    if (condicao !== 'saudavel' && condicao !== null) {
      await db.odontograma.add({
        owner_id: currentUser.id,
        paciente_id: pacienteSelecionado.id,
        dente_id: denteId,
        condicao: condicao,
        data: new Date().toISOString()
      });
    }
    carregarOdontograma(pacienteSelecionado.id);
  };

  // --- LÓGICA DE AUTENTICAÇÃO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const hashed = await hashPassword(loginForm.pass);
    const emailLimpo = loginForm.email.toLowerCase().trim();
    const account = await db.users.where({ email: emailLimpo }).first();

    if (account && account.password === hashed) {
      setCurrentUser(account);
      setIsLoggedIn(true);
      localStorage.setItem('odonto_session', JSON.stringify(account));
      if (account.role === 'admin') {
        carregarDadosAdmin(account.id);
        setActiveTab('dashboard');
      } else {
        carregarDadosPaciente(account.email);
        setActiveTab('consultas');
      }
    } else {
      alert('Credenciais inválidas.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const emailLimpo = loginForm.email.toLowerCase().trim();
    const userRole = emailLimpo.endsWith('@admin.com') ? 'admin' : 'paciente';
    const hashedPassword = await hashPassword(loginForm.pass);
    
    try {
      await db.users.add({ email: emailLimpo, password: hashedPassword, role: userRole });
      alert(`Conta de ${userRole} criada!`);
      setAuthMode('login');
    } catch (err) { alert("Erro ao criar conta."); }
  };

  // --- LÓGICA DE NEGÓCIO (ADMIN) ---
  const cadastrarPaciente = async (e) => {
    e.preventDefault();
    if (!novoPaciente.nome) return;
    await db.pacientes.add({ ...novoPaciente, owner_id: currentUser.id });
    setNovoPaciente({ nome: '', cpf: '', email_paciente: '', prontuario: '' });
    carregarDadosAdmin(currentUser.id);
  };

  const deletarPaciente = async (id) => {
    if(confirm("Deseja realmente excluir este paciente?")) {
      await db.pacientes.delete(id);
      carregarDadosAdmin(currentUser.id);
    }
  };

  const marcarConsulta = async (e) => {
    e.preventDefault();
    const pacienteObj = pacientes.find(p => p.id === parseInt(novaConsulta.paciente_id));
    await db.agendamentos.add({ 
      ...novaConsulta, 
      owner_id: currentUser.id,
      paciente_nome: pacienteObj?.nome,
      email_paciente: pacienteObj?.email_paciente?.toLowerCase().trim()
    });
    setNovaConsulta({ paciente_id: '', data: '', hora: '', procedimento: '' });
    carregarDadosAdmin(currentUser.id);
    alert("Consulta agendada!");
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- RENDERIZAÇÃO: TELAS DE ACESSO ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] p-6 text-white font-sans">
        <div className="w-full max-w-md bg-[#1e293b] rounded-3xl shadow-2xl p-10 border border-slate-700/50">
          <div className="text-center mb-10">
            <Activity size={40} className="text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">Odonto Scrum</h1>
            <p className="text-slate-400 text-sm mt-1">{authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta local'}</p>
          </div>
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <input type="email" required placeholder="E-mail" className="w-full bg-[#0f172a] p-4 rounded-2xl border border-slate-700 outline-none focus:border-blue-500" onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" required placeholder="Senha" className="w-full bg-[#0f172a] p-4 rounded-2xl border border-slate-700 outline-none focus:border-blue-500" onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black uppercase tracking-widest transition-all">{authMode === 'login' ? 'Entrar' : 'Registrar'}</button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-[10px] text-slate-500 font-bold hover:text-blue-400 uppercase tracking-widest">{authMode === 'login' ? 'Não tem conta? Registe-se' : 'Já tem conta? Login'}</button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0f172a] text-slate-300 flex flex-col shadow-2xl z-10">
        <div className="p-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs italic">C</div>
            ODONTO <span className="text-blue-500 text-[10px] bg-blue-500/10 px-2 py-1 rounded font-bold uppercase">{currentUser.role}</span>
          </h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {isAdmin ? (
            <>
              <NavItem active={activeTab === 'dashboard'} icon={<LayoutDashboard />} label="Dashboard" onClick={() => {setActiveTab('dashboard'); setPacienteSelecionado(null);}} />
              <NavItem active={activeTab === 'pacientes'} icon={<Users />} label="Pacientes" onClick={() => setActiveTab('pacientes')} />
              <NavItem active={activeTab === 'agenda'} icon={<Calendar />} label="Agenda Médica" onClick={() => {setActiveTab('agenda'); setPacienteSelecionado(null);}} />
              <NavItem active={activeTab === 'financeiro'} icon={<DollarSign />} label="Financeiro" onClick={() => {setActiveTab('financeiro'); setPacienteSelecionado(null);}} />
            </>
          ) : (
            <>
              <NavItem active={activeTab === 'consultas'} icon={<Calendar />} label="Minhas Consultas" onClick={() => setActiveTab('consultas')} />
              <NavItem active={activeTab === 'perfil'} icon={<UserCircle />} label="Meu Perfil" onClick={() => setActiveTab('perfil')} />
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-[#1e293b]/30">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/30">
              {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white uppercase truncate w-32">{currentUser.email.split('@')[0]}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-widest w-full px-2">
            <LogOut size={14} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-10">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && <DashboardView pacientesCount={pacientes.length} agendamentosCount={agendamentos.length} />}
            
            {activeTab === 'pacientes' && !pacienteSelecionado && (
              <PacientesView 
                pacientes={pacientes} 
                novo={novoPaciente} 
                setNovo={setNovoPaciente} 
                save={cadastrarPaciente}
                search={searchTerm}
                setSearch={setSearchTerm}
                deletar={deletarPaciente}
                onSelect={(p) => { setPacienteSelecionado(p); carregarOdontograma(p.id); }}
              />
            )}

            {pacienteSelecionado && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <button onClick={() => setPacienteSelecionado(null)} className="text-blue-600 font-bold mb-4 flex items-center gap-2">← Voltar para Lista</button>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <header className="mb-8 border-b pb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{pacienteSelecionado.nome}</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Prontuário e Odontograma Digital</p>
                  </header>
                  <OdontogramaView data={odontogramaData} onDenteClick={atualizarDente} />
                </div>
              </div>
            )}

            {activeTab === 'agenda' && (
              <AgendaView 
                pacientes={pacientes} 
                agendamentos={agendamentos} 
                nova={novaConsulta} 
                setNova={setNovaConsulta} 
                save={marcarConsulta} 
              />
            )}
            {activeTab === 'financeiro' && <PlaceholderView tab="Financeiro" />}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {activeTab === 'consultas' && (
               <div className="space-y-6">
                  <header>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Suas Consultas</h1>
                    <p className="text-slate-500 font-medium">Histórico e próximos agendamentos.</p>
                  </header>
                  <div className="grid gap-4">
                    {agendamentos.length > 0 ? agendamentos.map(ag => (
                      <div key={ag.id} className="bg-white p-6 rounded-3xl border-l-4 border-l-blue-600 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">{ag.procedimento}</p>
                          <p className="text-xl font-bold text-slate-800">{new Date(ag.data).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="flex items-center gap-2 text-slate-500 font-bold text-sm"><Clock size={16}/> {ag.hora}</p>
                          <span className="text-[9px] bg-green-100 text-green-600 px-3 py-1 rounded-full font-black uppercase mt-2">Confirmado</span>
                        </div>
                      </div>
                    )) : <p className="text-slate-400 italic">Nenhum agendamento encontrado para seu e-mail.</p>}
                  </div>
               </div>
             )}
             {activeTab === 'perfil' && <PlaceholderView tab="Meu Perfil" subtitle="Dados do seu prontuário clínico." />}
          </div>
        )}
      </main>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
      {React.cloneElement(icon, { size: 18 })} {label}
    </button>
  );
}

function PlaceholderView({ tab, subtitle = "Módulo em desenvolvimento (Sprint Scrum)..." }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-pulse">
      <Activity size={48} className="mb-4 opacity-10" />
      <p className="font-bold uppercase tracking-widest text-[10px]">{tab}</p>
      <p className="text-sm italic">{subtitle}</p>
    </div>
  );
}

function DashboardView({ pacientesCount, agendamentosCount }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium">Visão panorâmica da clínica.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
        <StatsCard label="Pacientes" value={pacientesCount} color="blue" icon={<Users size={24}/>} />
        <StatsCard label="Consultas" value={agendamentosCount} color="purple" icon={<Calendar size={24}/>} />
        <StatsCard label="Receita" value="R$ 0,00" color="green" icon={<DollarSign size={24}/>} />
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-slate-800 mb-2 font-sans">Próximos Passos</h3>
          <p className="text-slate-500 text-sm leading-relaxed">Agenda e Gestão de Pacientes integradas. O próximo rito é o fechamento financeiro e Odontograma.</p>
        </div>
        <CheckCircle2 size={40} className="text-blue-600 hidden md:block" />
      </div>
    </div>
  );
}

function StatsCard({ label, value, color, icon }) {
  const colors = { blue: 'text-blue-600 bg-blue-50', purple: 'text-purple-600 bg-purple-50', green: 'text-green-600 bg-green-50' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:scale-105">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0 ${colors[color]}`}>{icon}</div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
  );
}

function PacientesView({ pacientes, novo, setNovo, save, search, setSearch, deletar, onSelect }) {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Pacientes</h1>
          <p className="text-slate-500 font-medium text-sm text-center md:text-left">Listagem e prontuários.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Nome ou CPF..." className="pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
          <h3 className="text-xs font-black mb-6 text-slate-800 flex items-center gap-2 uppercase tracking-widest"><Plus size={18} className="text-blue-600" /> Novo Cadastro</h3>
          <form onSubmit={save} className="space-y-4 text-xs">
            <input placeholder="Nome Completo" required className="w-full p-4 bg-slate-50 border rounded-xl outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input placeholder="CPF" className="w-full p-4 bg-slate-50 border rounded-xl outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: e.target.value})} />
            <input placeholder="Email de Acesso" required className="w-full p-4 bg-slate-50 border rounded-xl outline-none" value={novo.email_paciente} onChange={e => setNovo({...novo, email_paciente: e.target.value})} />
            <textarea placeholder="Notas Prontuário" rows="3" className="w-full p-4 bg-slate-50 border rounded-xl outline-none" value={novo.prontuario} onChange={e => setNovo({...novo, prontuario: e.target.value})} />
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"><Save size={16} className="inline mr-2"/> Salvar Paciente</button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b"><th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Informações</th><th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Acesso</th><th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Ações</th></tr>
            </thead>
            <tbody>
              {pacientes.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())).map(p => (
                <tr key={p.id} className="border-b hover:bg-slate-50 transition-all group font-medium cursor-pointer" onClick={() => onSelect(p)}>
                  <td className="p-6"><p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{p.nome}</p><p className="text-[9px] text-slate-400 font-bold uppercase">CPF: {p.cpf || '---'}</p></td>
                  <td className="p-6 text-xs text-slate-500">{p.email_paciente}</td>
                  <td className="p-6 text-right"><button onClick={(e) => { e.stopPropagation(); deletar(p.id); }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ pacientes, agendamentos, nova, setNova, save }) {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Agenda Médica</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
          <h3 className="text-xs font-black mb-6 text-slate-400 uppercase tracking-widest">Marcar Consulta</h3>
          <form onSubmit={save} className="space-y-4 text-xs font-bold">
            <select required className="w-full p-4 bg-slate-50 border rounded-xl" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}>
              <option value="">Selecionar Paciente...</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required className="p-4 bg-slate-50 border rounded-xl" value={nova.data} onChange={e => setNova({...nova, data: e.target.value})} />
              <input type="time" required className="p-4 bg-slate-50 border rounded-xl" value={nova.hora} onChange={e => setNova({...nova, hora: e.target.value})} />
            </div>
            <input placeholder="Procedimento (Ex: Limpeza)" required className="w-full p-4 bg-slate-50 border rounded-xl" value={nova.procedimento} onChange={e => setNova({...nova, procedimento: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg">Confirmar Agendamento</button>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Próximos da Clínica</p>
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
              <div><p className="font-bold text-slate-900">{ag.paciente_nome}</p><p className="text-[10px] font-black text-blue-500 uppercase">{ag.procedimento}</p></div>
              <div className="text-right flex flex-col items-end">
                <p className="text-sm font-black text-slate-700">{new Date(ag.data).toLocaleDateString('pt-BR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> {ag.hora}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTE ODONTOGRAMA ---
function OdontogramaView({ data, onDenteClick }) {
  const arcadaSuperior = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const arcadaInferior = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  const renderDente = (id) => {
    const registro = data.find(d => d.dente_id === id);
    const cores = { carie: 'bg-red-500 border-red-700', canal: 'bg-blue-500 border-blue-700', extraido: 'bg-slate-300 border-slate-400 opacity-20' };
    const classe = registro ? cores[registro.condicao] : 'bg-white border-slate-200 hover:bg-blue-50';

    return (
      <div 
        key={id} 
        onClick={() => {
          const cond = prompt("Condição: carie, canal, extraido ou saudavel?");
          onDenteClick(id, cond);
        }}
        className={`w-9 h-12 border-2 rounded flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm ${classe}`}
      >
        <span className={`text-[8px] font-black ${registro ? 'text-white' : 'text-slate-400'}`}>{id}</span>
      </div>
    );
  };

  return (
    <div className="space-y-12 py-10 flex flex-col items-center overflow-x-auto">
      <div className="flex gap-1 mb-4">{arcadaSuperior.map(renderDente)}</div>
      <div className="w-full border-t border-dashed border-slate-200 relative">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Divisão Palatina</span>
      </div>
      <div className="flex gap-1 mt-4">{arcadaInferior.map(renderDente)}</div>
      
      <div className="mt-12 flex gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded shadow-sm"></div> Cárie</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div> Canal</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-300 rounded shadow-sm"></div> Extraído</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border-2 border-slate-200 rounded shadow-sm"></div> Saudável</div>
      </div>
    </div>
  );
}