export const getClientId = () => {
  const key = 'math_racers_client_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, id);
  return id;
};

