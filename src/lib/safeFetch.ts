/**
 * Safe fetch wrapper that guarantees JSON parsing and intercepts non-JSON HTML error pages,
 * preventing "Unexpected token 'T', 'The page c'... is not valid JSON".
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    let parsed: any = null;

    if (text && text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // Response was not valid JSON (e.g. an HTML 404/502 page from cloud proxy or nginx)
        const stripped = text.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
        const snippet = stripped.length > 140 ? `${stripped.slice(0, 140)}...` : stripped;
        return {
          ok: false,
          status: res.status,
          data: null,
          error:
            snippet ||
            `Resposta inesperada do servidor (HTTP ${res.status}). O endpoint não retornou JSON válido.`,
        };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: parsed?.error || parsed?.message || `Erro no servidor (HTTP ${res.status})`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed as T,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || "Falha de conexão com o servidor local.",
    };
  }
}
