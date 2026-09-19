// Cria um usuário de teste via supabase.auth.signUp.
//
// Credenciais NUNCA ficam hardcoded: lê de variáveis de ambiente.
// O app usa magic link (OTP) + Google — signUp com senha serve só para
// popular um usuário de teste no Auth. Se a confirmação de e-mail estiver
// ligada no projeto Supabase, o usuário precisa confirmar antes de logar.
//
// Uso (PowerShell):
//   $env:SEED_EMAIL="lucsbasto@gmail.com"; $env:SEED_PASSWORD="<senha>"; `
//     node --env-file=.env scripts/seed-user.mjs
//
// Uso (bash):
//   SEED_EMAIL=lucsbasto@gmail.com SEED_PASSWORD='<senha>' \
//     node --env-file=.env scripts/seed-user.mjs
//
// --env-file=.env carrega EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (Node >= 20.6).

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;

const missing = [
  ['EXPO_PUBLIC_SUPABASE_URL', url],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', anonKey],
  ['SEED_EMAIL', email],
  ['SEED_PASSWORD', password],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(`Faltam variáveis de ambiente: ${missing.join(', ')}`);
  process.exit(1);
}

if (password.length < 8) {
  console.error('SEED_PASSWORD muito curta (mínimo 8 caracteres).');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { data, error } = await supabase.auth.signUp({ email, password });

if (error) {
  console.error(`Falha no signUp: ${error.message}`);
  process.exit(1);
}

const needsConfirm = !data.session;
console.log(`Usuário criado: ${data.user?.email} (id: ${data.user?.id})`);
console.log(
  needsConfirm
    ? 'Confirmação de e-mail pendente: confirme pelo link enviado antes de logar.'
    : 'Sessão ativa: usuário já pode logar.'
);
