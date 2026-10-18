-- Índice para o limite de 10 tentativas por hora por IP em POST /recuperar, contado
-- sobre access_logs (a tabela que o Marco Civil já exige). Nenhuma coluna nova.
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_rota ON access_logs (ip, rota, ocorrido_em);
