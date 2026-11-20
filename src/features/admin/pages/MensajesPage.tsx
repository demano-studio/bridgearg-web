import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Send, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type {
  AdminContactMessageRow,
  AdminContactReplyRow,
  ContactChatBubble,
  ContactThread,
} from "@/features/admin/types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildThreads(
  messages: AdminContactMessageRow[],
  replies: AdminContactReplyRow[],
): ContactThread[] {
  const byEmail = new Map<string, ContactThread>();

  for (const msg of messages) {
    const key = normalizeEmail(msg.email);
    let thread = byEmail.get(key);
    if (!thread) {
      thread = {
        threadEmail: key,
        displayName: msg.full_name,
        displayEmail: msg.email,
        preview: "",
        lastAt: msg.created_at,
        unreadCount: 0,
        messages: [],
        replies: [],
      };
      byEmail.set(key, thread);
    }
    thread.messages.push(msg);
    if (msg.status === "new") thread.unreadCount += 1;
    if (new Date(msg.created_at) >= new Date(thread.lastAt)) {
      thread.lastAt = msg.created_at;
      thread.displayName = msg.full_name;
      thread.displayEmail = msg.email;
      thread.preview = msg.message;
    }
  }

  for (const reply of replies) {
    const key = normalizeEmail(reply.thread_email);
    let thread = byEmail.get(key);
    if (!thread) {
      thread = {
        threadEmail: key,
        displayName: reply.thread_email,
        displayEmail: reply.thread_email,
        preview: "",
        lastAt: reply.created_at,
        unreadCount: 0,
        messages: [],
        replies: [],
      };
      byEmail.set(key, thread);
    }
    thread.replies.push(reply);
    if (new Date(reply.created_at) >= new Date(thread.lastAt)) {
      thread.lastAt = reply.created_at;
      thread.preview = reply.body;
    }
  }

  return Array.from(byEmail.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

function bubblesForThread(
  thread: ContactThread,
  optimistic: ContactChatBubble[],
): ContactChatBubble[] {
  const inbound: ContactChatBubble[] = thread.messages.map((m) => ({
    kind: "inbound",
    id: `in-${m.id}`,
    created_at: m.created_at,
    body: m.message,
    subject: m.subject,
    status: m.status,
    messageId: m.id,
  }));
  const outbound: ContactChatBubble[] = thread.replies.map((r) => ({
    kind: "outbound",
    id: `out-${r.id}`,
    created_at: r.created_at,
    body: r.body,
    sent_by_email: r.sent_by_email,
    replyId: r.id,
  }));
  return [...inbound, ...outbound, ...optimistic].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function fmtThreadTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function fmtBubbleTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function MensajesPage() {
  const qc = useQueryClient();
  const access = useAdminAccess();
  const canEdit = access.canEdit("mensajes");
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("id");

  const [selectedEmail, setSelectedEmail] = React.useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = React.useState(false);
  const [q, setQ] = React.useState("");
  const deferredQ = React.useDeferredValue(q);
  const [draft, setDraft] = React.useState("");
  const [optimistic, setOptimistic] = React.useState<ContactChatBubble[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<ContactThread | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const openedFromSearch = React.useRef<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "contact-messages"],
    queryFn: async () => {
      const sb = getSupabase();
      const [{ data: messages, error: mErr }, { data: replies, error: rErr }] = await Promise.all([
        sb
          .from("contact_messages")
          .select("id,full_name,email,subject,message,status,marketing_consent,read_at,responded_at,created_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        sb
          .from("contact_message_replies")
          .select("id,thread_email,body,sent_by_email,resend_id,created_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
      ]);
      if (mErr) throw new Error(mErr.message);
      if (rErr) throw new Error(rErr.message);
      return {
        messages: (messages ?? []) as AdminContactMessageRow[],
        replies: (replies ?? []) as AdminContactReplyRow[],
      };
    },
  });

  const threads = React.useMemo(
    () => buildThreads(data?.messages ?? [], data?.replies ?? []),
    [data],
  );

  const filteredThreads = React.useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((t) => {
      const hay = [t.displayName, t.displayEmail, t.preview].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [threads, deferredQ]);

  const selectedThread =
    selectedEmail != null
      ? (threads.find((t) => t.threadEmail === selectedEmail) ?? null)
      : null;

  const threadOptimistic = React.useMemo(
    () =>
      selectedEmail
        ? optimistic.filter(
            (b) =>
              b.kind === "outbound" &&
              // optimistic bubbles are scoped by selected email via id prefix
              b.id.startsWith(`opt-${selectedEmail}-`),
          )
        : [],
    [optimistic, selectedEmail],
  );

  const bubbles = selectedThread ? bubblesForThread(selectedThread, threadOptimistic) : [];

  const invalidateInbox = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
    void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
    void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
    void qc.invalidateQueries({ queryKey: ["admin", "papelera"] });
  }, [qc]);

  const markRead = useMutation({
    mutationFn: async (threadEmail: string) =>
      adminWrite("message.markThreadRead", { thread_email: threadEmail }),
    onSuccess: () => invalidateInbox(),
  });

  const deleteThread = useMutation({
    mutationFn: async (threadEmail: string) =>
      adminWrite("message.deleteThread", { thread_email: threadEmail }),
    onSuccess: () => {
      toast({ title: "Conversación eliminada", description: "Se puede restaurar desde Papelera." });
      setDeleteTarget(null);
      setSelectedEmail(null);
      setMobileShowChat(false);
      invalidateInbox();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" }),
  });

  const replyMut = useMutation({
    mutationFn: async (input: { thread_email: string; body: string; tempId: string }) => {
      const result = (await adminWrite("message.reply", {
        thread_email: input.thread_email,
        body: input.body,
      })) as { reply: AdminContactReplyRow; thread_email: string };
      return { ...result, tempId: input.tempId };
    },
    onSuccess: (result) => {
      setOptimistic((prev) => prev.filter((b) => b.id !== result.tempId));
      invalidateInbox();
      toast({ title: "Respuesta enviada" });
    },
    onError: (e: Error, vars) => {
      setOptimistic((prev) =>
        prev.map((b) => (b.id === vars.tempId ? { ...b, pending: false, failed: true } : b)),
      );
      toast({
        title: "No se pudo enviar",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  function openThread(thread: ContactThread) {
    setSelectedEmail(thread.threadEmail);
    setMobileShowChat(true);
    setDraft("");
    setOptimistic((prev) => prev.filter((b) => !b.failed));
    if (thread.unreadCount > 0) {
      markRead.mutate(thread.threadEmail);
    }
  }

  function closeMobileChat() {
    setMobileShowChat(false);
  }

  function sendReply() {
    if (!selectedThread || !canEdit) return;
    const body = draft.trim();
    if (!body || replyMut.isPending) return;

    const tempId = `opt-${selectedThread.threadEmail}-${Date.now()}`;
    const bubble: ContactChatBubble = {
      kind: "outbound",
      id: tempId,
      created_at: new Date().toISOString(),
      body,
      sent_by_email: access.email,
      replyId: "optimistic",
      pending: true,
    };
    setOptimistic((prev) => [...prev, bubble]);
    setDraft("");
    replyMut.mutate({
      thread_email: selectedThread.threadEmail,
      body,
      tempId,
    });
  }

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles.length, selectedEmail, mobileShowChat]);

  React.useEffect(() => {
    if (!openId || !/^\d+$/.test(openId) || !data?.messages.length) return;
    const id = Number(openId);
    if (openedFromSearch.current === id) return;
    const row = data.messages.find((m) => m.id === id);
    if (!row) return;
    openedFromSearch.current = id;
    const thread = threads.find((t) => t.threadEmail === normalizeEmail(row.email));
    if (thread) openThread(thread);
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from deep link
  }, [openId, data?.messages, threads]);

  const unreadTotal = threads.reduce((n, t) => n + t.unreadCount, 0);

  return (
    <div className="admin-chat">
      <div className="admin-chat__header">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mensajes</h1>
          <p className="text-sm text-muted-foreground">
            Conversaciones del formulario de contact
            {unreadTotal > 0 ? ` · ${unreadTotal} sin leer` : ""}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando mensajes…</p>
      ) : isError ? (
        <p className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          No se pudieron cargar los mensajes{error instanceof Error && error.message ? `: ${error.message}` : "."}
        </p>
      ) : (
        <div className={`admin-chat__shell${mobileShowChat ? " is-mobile-chat" : ""}`}>
          {/* Thread list */}
          <aside className="admin-chat__list">
            <div className="admin-chat__list-search">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar nombre o email…"
                className="border-bridge-black/20"
              />
            </div>
            {filteredThreads.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                {threads.length === 0
                  ? "Todavía no hay mensajes."
                  : "No hay conversaciones con este filtro."}
              </p>
            ) : (
              <ul className="admin-chat__thread-list">
                {filteredThreads.map((thread) => {
                  const active = selectedEmail === thread.threadEmail;
                  return (
                    <li key={thread.threadEmail}>
                      <button
                        type="button"
                        className={`admin-chat__thread${active ? " is-active" : ""}${
                          thread.unreadCount > 0 ? " is-unread" : ""
                        }`}
                        onClick={() => openThread(thread)}
                      >
                        <div className="admin-chat__thread-top">
                          <span className="admin-chat__thread-name">{thread.displayName}</span>
                          <span className="admin-chat__thread-time">{fmtThreadTime(thread.lastAt)}</span>
                        </div>
                        <div className="admin-chat__thread-bottom">
                          <span className="admin-chat__thread-preview">{thread.preview || "—"}</span>
                          {thread.unreadCount > 0 ? (
                            <span className="admin-chat__thread-dot" aria-label={`${thread.unreadCount} sin leer`} />
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Conversation */}
          <section className="admin-chat__pane" aria-live="polite">
            {!selectedThread ? (
              <div className="admin-chat__empty">
                <p className="text-sm text-muted-foreground">Elegí una conversación para ver el hilo.</p>
              </div>
            ) : (
              <>
                <header className="admin-chat__pane-header">
                  <button
                    type="button"
                    className="admin-chat__back"
                    onClick={closeMobileChat}
                    aria-label="Volver a la lista"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{selectedThread.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">{selectedThread.displayEmail}</div>
                  </div>
                  {canEdit ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="admin-chat__delete-desktop border-bridge-black/20 text-destructive"
                        onClick={() => setDeleteTarget(selectedThread)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="admin-chat__delete-mobile h-9 w-9"
                            aria-label="Opciones de la conversación"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-bridge-black/15">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(selectedThread)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar conversación
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : null}
                </header>

                <div className="admin-chat__bubbles">
                  {bubbles.map((b) => (
                    <div
                      key={b.id}
                      className={`admin-chat__bubble admin-chat__bubble--${b.kind}${
                        b.kind === "outbound" && b.pending ? " is-pending" : ""
                      }${b.kind === "outbound" && b.failed ? " is-failed" : ""}`}
                    >
                      {b.kind === "inbound" ? (
                        <div className="admin-chat__bubble-subject">{b.subject}</div>
                      ) : null}
                      <div className="admin-chat__bubble-body">{b.body}</div>
                      <div className="admin-chat__bubble-meta">
                        {fmtBubbleTime(b.created_at)}
                        {b.kind === "outbound" && b.pending ? " · Enviando…" : null}
                        {b.kind === "outbound" && b.failed ? " · Error al enviar" : null}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form
                  className="admin-chat__composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply();
                  }}
                >
                  {canEdit ? (
                    <>
                      <Textarea
                        ref={composerRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Escribí una respuesta…"
                        rows={2}
                        className="admin-chat__composer-input border-bridge-black/20"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        className="admin-chat__composer-send bg-bridge-black text-[#fcf8ea]"
                        disabled={!draft.trim() || replyMut.isPending}
                        aria-label="Enviar respuesta"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Enviar</span>
                      </Button>
                    </>
                  ) : (
                    <p className="px-1 text-sm text-muted-foreground">Solo lectura — no podés responder.</p>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      )}

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteThread.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-bridge-black/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              ¿Eliminar esta conversación con{" "}
              <strong>{deleteTarget?.displayName || deleteTarget?.displayEmail}</strong>
              {deleteTarget?.displayEmail ? ` (${deleteTarget.displayEmail})` : ""}? Se puede restaurar desde
              Papelera.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-bridge-black/20"
              disabled={deleteThread.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteThread.isPending || !deleteTarget}
              onClick={() => {
                if (deleteTarget) deleteThread.mutate(deleteTarget.threadEmail);
              }}
            >
              Eliminar conversación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
