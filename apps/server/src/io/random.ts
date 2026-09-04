export function rollDice(): [number, number] {
  return [
    Math.ceil(Math.random() * 6),
    Math.ceil(Math.random() * 6),
  ];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function generatePlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 6)}`;
}
