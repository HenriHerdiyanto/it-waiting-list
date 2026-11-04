const PIC_SEPARATOR = /[,;]+/;

/**
 * Menormalkan PIC dari data baru (array) maupun data lama (string dipisah koma).
 * Nama kosong dibuang dan duplikat dihilangkan tanpa membedakan huruf besar/kecil.
 */
export function normalizePicNames(value) {
  const source = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const names = [];

  source.forEach((entry) => {
    String(entry ?? '')
      .split(PIC_SEPARATOR)
      .forEach((part) => {
        const nama = part.trim();
        if (!nama) return;

        const key = nama.toLowerCase();
        if (seen.has(key)) return;

        seen.add(key);
        names.push(nama);
      });
  });

  return names;
}

/** True jika nilai sudah berupa array PIC yang rapi (tanpa string gabungan/duplikat). */
export function isCanonicalPicArray(value) {
  if (!Array.isArray(value)) return false;

  const normalized = normalizePicNames(value);
  return (
    value.length === normalized.length &&
    value.every((entry, index) => entry === normalized[index])
  );
}

export function formatPicNames(value, separator = ', ') {
  return normalizePicNames(value).join(separator);
}

export function hasPic(value, name) {
  const key = String(name ?? '').trim().toLowerCase();
  if (!key) return false;

  return normalizePicNames(value).some((entry) => entry.toLowerCase() === key);
}

export function picsOverlap(a, b) {
  const left = normalizePicNames(a);
  if (left.length === 0) return false;

  const right = new Set(normalizePicNames(b).map((name) => name.toLowerCase()));
  return left.some((name) => right.has(name.toLowerCase()));
}

/** Mengganti satu nama PIC tanpa mengubah PIC lain pada request yang sama. */
export function replacePicName(value, oldName, newName) {
  const oldKey = String(oldName ?? '').trim().toLowerCase();
  const nextName = String(newName ?? '').trim();
  const names = normalizePicNames(value);

  if (!oldKey || !nextName) return names;

  return normalizePicNames(
    names.map((name) => (name.toLowerCase() === oldKey ? nextName : name)),
  );
}
