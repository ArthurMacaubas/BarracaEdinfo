function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function canApplyPixAmount(payload: string) {
  const normalized = payload.trim().replaceAll(/\s+/g, "");
  return /^\d{2}\d{2}[\s\S]*6304[\dA-Fa-f]{4}$/.test(normalized);
}

export function applyPixAmount(payload: string, amount: number) {
  const normalized = payload.trim().replaceAll(/\s+/g, "");
  if (!canApplyPixAmount(normalized) || !Number.isFinite(amount) || amount <= 0) return payload.trim();
  const body = normalized.slice(0, -8);
  const fields: Array<{ tag: string; value: string }> = [];
  for (let cursor = 0; cursor < body.length;) {
    const tag = body.slice(cursor, cursor + 2);
    const length = Number(body.slice(cursor + 2, cursor + 4));
    const value = body.slice(cursor + 4, cursor + 4 + length);
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(length) || value.length !== length) return payload.trim();
    fields.push({ tag, value });
    cursor += 4 + length;
  }
  const value = amount.toFixed(2);
  const amountField = { tag: "54", value };
  const withoutAmount = fields.filter(field => field.tag !== "54");
  const amountIndex = fields.findIndex(field => field.tag === "54");
  const updated = [...withoutAmount];
  updated.splice(amountIndex >= 0 ? amountIndex : updated.length, 0, amountField);
  const payloadWithoutCrc = updated.map(field => `${field.tag}${String(field.value.length).padStart(2, "0")}${field.value}`).join("") + "6304";
  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}
