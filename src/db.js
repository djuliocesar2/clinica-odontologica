import Dexie from 'dexie';

/**
 * DATABASE CONFIGURATION - ODONTO SCRUM PRO
 * Versão 5: Inclui suporte total a perfis, odontograma e financeiro.
 */
export const db = new Dexie('OdontoProDB_V5');

db.version(1).stores({
  // Tabela de Usuários: Guarda credenciais e dados do perfil do paciente
  // Indices: id (auto), email (para login), role (acesso)
  users: '++id, email, password, role, nome, telefone, endereco, alergias', 
  
  // Tabela de Pacientes: Prontuários criados pelo dentista
  // Indices: id (auto), owner_id (vínculo com admin)
  pacientes: '++id, owner_id, nome, cpf, email_paciente, prontuario',
  
  // Tabela de Agendamentos: Consultas da clínica
  // Indices: id, data e hora (para validação de conflitos de 30min)
  agendamentos: '++id, owner_id, paciente_id, paciente_nome, email_paciente, data, hora, procedimento',
  
  // Tabela de Odontograma: Registro visual de cada dente
  // Indices: id, paciente_id (vínculo com o prontuário)
  odontograma: '++id, owner_id, paciente_id, dente_id, condicao, data',
  
  // Tabela Financeiro: Fluxo de caixa (entradas e saídas)
  // Indices: id, owner_id, tipo (receita/despesa)
  financeiro: '++id, owner_id, tipo, valor, categoria, data'
});

/**
 * SEGURANÇA: Transforma a senha em Hash SHA-256
 * Garante que a senha não fique em texto puro no navegador.
 */
export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}