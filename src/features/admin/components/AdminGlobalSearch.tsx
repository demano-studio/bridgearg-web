import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";

type SearchHit = {
  key: string;
  kind: "obra" | "artista" | "lote" | "pedido" | "mensaje";
  label: string;
  hint?: string;
  href: string;
};

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  obra: "Obra",
  artista: "Artista",
  lote: "Lote",
  pedido: "Pedido",
  mensaje: "Mensaje",
};

function sanitizeTerm(raw: string) {
  return raw
    .trim()
    .replace(/[%_,"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function AdminGlobalSearch() {
  const navigate = useNavigate();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const term = sanitizeTerm(deferredQuery);
  const enabled = term.length >= 2;

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["admin", "global-search", term],
    enabled,
    staleTime: 15_000,
    queryFn: async (): Promise<SearchHit[]> => {
      const sb = getSupabase();
      const like = `%${term}%`;
      const orLike = (cols: string[]) => cols.map((c) => `${c}.ilike."${like}"`).join(",");
      const [obras, artistas, lotes, pedidos, mensajes] = await Promise.all([
        sb
          .from("artworks")
          .select("id,title,artists(name)")
          .ilike("title", like)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .limit(5),
        sb
          .from("artists")
          .select("id,name,slug,email")
          .or(orLike(["name", "slug", "email"]))
          .order("name")
          .limit(5),
        sb
          .from("lotes")
          .select("id,nombre")
          .ilike("nombre", like)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .limit(5),
        sb
          .from("purchases")
          .select("id,buyer_name,buyer_email,artworks(title)")
          .or(orLike(["buyer_name", "buyer_email"]))
          .order("created_at", { ascending: false })
          .limit(5),
        sb
          .from("contact_messages")
          .select("id,full_name,email,subject")
          .or(orLike(["full_name", "email", "subject"]))
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const out: SearchHit[] = [];

      for (const row of obras.data ?? []) {
        const artist =
          row.artists && typeof row.artists === "object" && "name" in row.artists
            ? String((row.artists as { name: string }).name)
            : undefined;
        out.push({
          key: `obra-${row.id}`,
          kind: "obra",
          label: String(row.title ?? `Obra #${row.id}`),
          hint: artist,
          href: `/admin/obras?edit=${row.id}`,
        });
      }

      for (const row of artistas.data ?? []) {
        out.push({
          key: `artista-${row.id}`,
          kind: "artista",
          label: String(row.name),
          hint: row.email || row.slug || undefined,
          href: `/admin/artistas?edit=${row.id}`,
        });
      }

      for (const row of lotes.data ?? []) {
        out.push({
          key: `lote-${row.id}`,
          kind: "lote",
          label: String(row.nombre),
          hint: `Lote #${row.id}`,
          href: `/admin/lotes/${row.id}`,
        });
      }

      for (const row of pedidos.data ?? []) {
        const artworkTitle =
          row.artworks && typeof row.artworks === "object" && "title" in row.artworks
            ? String((row.artworks as { title: string }).title)
            : undefined;
        out.push({
          key: `pedido-${row.id}`,
          kind: "pedido",
          label: String(row.buyer_name?.trim() || row.buyer_email || `Pedido #${row.id}`),
          hint: artworkTitle || row.buyer_email || undefined,
          href: `/admin/pedidos?id=${row.id}`,
        });
      }

      for (const row of mensajes.data ?? []) {
        out.push({
          key: `mensaje-${row.id}`,
          kind: "mensaje",
          label: String(row.subject || row.full_name || `Mensaje #${row.id}`),
          hint: [row.full_name, row.email].filter(Boolean).join(" · ") || undefined,
          href: `/admin/mensajes?id=${row.id}`,
        });
      }

      return out;
    },
  });

  React.useEffect(() => {
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    navigate(href);
  }

  const showPanel = open && (query.trim().length > 0 || isFetching);

  return (
    <div className="admin-global-search" ref={rootRef}>
      <div className="admin-global-search__field">
        <Search className="admin-global-search__icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar obra, artista, pedido…"
          aria-label="Búsqueda global"
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className="admin-global-search__clear"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="admin-global-search__kbd">⌘K</kbd>
        )}
      </div>

      {showPanel ? (
        <div className="admin-global-search__panel" role="listbox" aria-label="Resultados">
          {!enabled ? (
            <p className="admin-global-search__empty">Escribí al menos 2 caracteres.</p>
          ) : isFetching && hits.length === 0 ? (
            <p className="admin-global-search__empty">
              <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
              Buscando…
            </p>
          ) : hits.length === 0 ? (
            <p className="admin-global-search__empty">Sin resultados para “{term}”.</p>
          ) : (
            <ul className="admin-global-search__list">
              {hits.map((hit) => (
                <li key={hit.key}>
                  <button type="button" className="admin-global-search__item" onClick={() => go(hit.href)}>
                    <span className="admin-global-search__kind">{KIND_LABEL[hit.kind]}</span>
                    <span className="admin-global-search__label">{hit.label}</span>
                    {hit.hint ? <span className="admin-global-search__hint">{hit.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
