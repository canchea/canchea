export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const raw = value == null ? "" : String(value);
    // Evita inyección de fórmulas al abrir el archivo en Excel o Sheets.
    // Teléfonos como +591... son sólo dígitos y no pueden ejecutarse como fórmula.
    const isFormula = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) && !/^[+-]?\d[\d\s.]*$/.test(raw);
    const text = isFormula ? `'${raw}` : raw;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")}`;
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const EXPORT_PAGE_SIZE = 1000;

// PostgREST limita cada respuesta a 1000 filas; recorre todas las páginas.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + EXPORT_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < EXPORT_PAGE_SIZE) return { data: rows, error: null };
  }
}
