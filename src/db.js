import Dexie from 'dexie';

// Definimos o nome do banco e a versão. 
// Subir a versão para 2 é essencial para o navegador aceitar a nova tabela 'odontograma'.
export const db = new Dexie('ClinicaDB_Final');

db.version(2).stores({
  // Tabela de usuários para Login (Admin vs Paciente)
  users: '++id, email', 
  
  // Tabela de pacientes cadastrados pelo Admin
  pacientes: '++id, owner_id, nome, cpf, email_paciente, prontuario',
  
  // Tabela de consultas vinculadas aos pacientes
  agendamentos: '++id, owner_id, paciente_id, paciente_nome, email_paciente, data, hora, procedimento',
  
  // NOVA TABELA: ODONTOGRAMA (Mapa dos dentes)
  // dente_id: número do dente (ex: 11, 21, 48)
  // condicao: o que o dente tem (ex: 'carie', 'canal', 'extraido')
  odontograma: '++id, owner_id, paciente_id, dente_id, condicao, data'
});

/**
 * Função para transformar senha em Hash SHA-256.
 * Garante que a senha não seja salva em texto puro no IndexedDB.
 */
export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}