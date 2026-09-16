-- pgcrypto: necessária para crypt()/gen_salt() usados no seed de desenvolvimento
-- (usuário demo em auth.users). Extensão base, idempotente.
create extension if not exists pgcrypto;
