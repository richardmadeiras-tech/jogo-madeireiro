export function formatarReais(valor) {
  const n = Math.floor(Number.isFinite(valor) ? Math.max(0, valor) : 0);
  if (n >= 1e6) return 'R$ ' + (Math.floor(n / 1e5) / 10).toFixed(1).replace('.', ',') + ' mi';
  return 'R$ ' + n.toLocaleString('pt-BR');
}
