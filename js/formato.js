export function formatarReais(valor) {
  const n = Math.floor(Number.isFinite(valor) ? Math.max(0, valor) : 0);
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
  return 'R$ ' + n.toLocaleString('pt-BR');
}
