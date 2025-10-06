/**
 * Formata um CUID longo do banco de dados em um ID curto e legível para o usuário.
 * Exemplo: "clxkzjw1b000008l3b1g2c3d4" se torna "T-B1G2-C3D4"
 * @param cuid O ID completo vindo do banco de dados.
 * @returns Um ID formatado para exibição.
 */
export const formatTaskIdForDisplay = (cuid: string): string => {
  // Se o ID for inválido ou muito curto, retorna um placeholder.
  if (!cuid || cuid.length < 8) {
    return 'ID-INVÁLIDO';
  }

  // 1. Pega os últimos 8 caracteres do ID.
  const shortId = cuid.slice(-8);

  // 2. Formata com um prefixo e um hífen para melhorar a legibilidade.
  // Ex: "b1g2c3d4" vira "T-b1g2-c3d4"
  const formattedId = `T-${shortId.slice(0, 4)}-${shortId.slice(4)}`;

  // 3. Converte para maiúsculas para um visual mais limpo e profissional.
  return formattedId.toUpperCase();
};