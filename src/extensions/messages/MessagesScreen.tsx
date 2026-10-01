import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, BellOff, Camera, Loader2, MoreHorizontal, Plus, RotateCw, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildVariants, putSigned } from "@/extensions/photos/pipeline";
import {
  createMessagePhotoUpload, deleteMessage, editMessage, getMessageById, listMessages,
  markMessagesRead, sendMessage, setMessageNotifications,
} from "@/lib/messages.functions";
import { MESSAGE_MAX_LENGTH, type ChatMessage, type MessagesConfig } from "./config";

type Pending = { tempId: string; text: string; photo?: File; status: "sending" | "failed" };

const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function MessagesScreen({ eventId, focusId }: { eventId: string; focusId?: string }) {
  const { user } = useSession();
  const listFn = useServerFn(listMessages);
  const getOne = useServerFn(getMessageById);
  const sendFn = useServerFn(sendMessage);
  const editFn = useServerFn(editMessage);
  const deleteFn = useServerFn(deleteMessage);
  const readFn = useServerFn(markMessagesRead);
  const prefFn = useServerFn(setMessageNotifications);
  const uploadFn = useServerFn(createMessagePhotoUpload);

  const draftKey = `kozy.messages.draft.${eventId}`;
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<{ title: string; count: number; isOrganizer: boolean; notif: boolean; config: MessagesConfig; lastReadAt: string | null } | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [toDelete, setToDelete] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);

  useEffect(() => { setText(localStorage.getItem(draftKey) ?? ""); }, [draftKey]);
  useEffect(() => { if (!editing) localStorage.setItem(draftKey, text); }, [text, draftKey, editing]);

  const load = useCallback(async () => {
    const res = await listFn({ data: { eventId, around: focusId } });
    if (!res.ok) return setState("denied");
    setMessages(res.messages);
    setHasMore(res.hasMore);
    setMeta({ title: res.eventTitle, count: res.participantCount, isOrganizer: res.isOrganizer, notif: res.notificationsEnabled, config: res.config, lastReadAt: res.lastReadAt });
    setState("ready");
    readFn({ data: { eventId } }).catch(() => {});
  }, [eventId, focusId]);

  useEffect(() => { load().catch(() => setState("denied")); }, [load]);

  // Temps réel : les règles d'accès de la base filtrent ce que chacun reçoit.
  useEffect(() => {
    if (state !== "ready") return;
    const channel = supabase
      .channel(`event-messages-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_message", filter: `event_id=eq.${eventId}` }, async (payload) => {
        const id = (payload.new as { id?: string })?.id;
        if (!id) return;
        const msg = await getOne({ data: { eventId, id } });
        if (!msg) return;
        setMessages((list) => {
          const i = list.findIndex((m) => m.id === msg.id);
          if (i >= 0) { const c = [...list]; c[i] = msg; return c; }
          return [...list, msg];
        });
        readFn({ data: { eventId } }).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [state, eventId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (focusId) {
      const target = document.getElementById(`msg-${focusId}`);
      if (target && state === "ready" && !stickBottom.current) return;
      if (target) { target.scrollIntoView({ block: "center" }); stickBottom.current = false; return; }
    }
    if (stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending, state]);

  const onScroll = async () => {
    const el = scrollRef.current!;
    stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && hasMore && !loadingMore && messages[0]) {
      setLoadingMore(true);
      const res = await listFn({ data: { eventId, before: messages[0].createdAt } }).catch(() => null);
      if (res?.ok) {
        prevHeight.current = el.scrollHeight;
        setMessages((l) => [...res.messages.filter((m) => !l.some((x) => x.id === m.id)), ...l]);
        setHasMore(res.hasMore);
      }
      setLoadingMore(false);
    }
  };

  const deliver = async (p: Pending) => {
    setPending((l) => l.map((x) => (x.tempId === p.tempId ? { ...x, status: "sending" } : x)));
    try {
      let photoPath: string | undefined;
      if (p.photo) {
        const { variants } = await buildVariants(p.photo, { thumbnailSize: 1600, mediumSize: 1600, largeSize: 1600, quality: 82 });
        const blob = variants[variants.length - 1]!.blob;
        const slot = await uploadFn({ data: { eventId, size: blob.size } });
        if (!slot.ok) throw new Error();
        await putSigned(slot.uploadUrl, blob, "image/webp");
        photoPath = slot.path;
      }
      const res = await sendFn({ data: { eventId, text: p.text || undefined, photoPath } });
      if (!res.ok) throw new Error();
      setPending((l) => l.filter((x) => x.tempId !== p.tempId));
      setMessages((l) => (l.some((m) => m.id === res.message.id) ? l : [...l, res.message]));
    } catch {
      setPending((l) => l.map((x) => (x.tempId === p.tempId ? { ...x, status: "failed" } : x)));
    }
  };

  const submit = async (photo?: File) => {
    if (editing) {
      const v = text.trim();
      if (!v) return;
      const res = await editFn({ data: { eventId, id: editing.id, text: v } }).catch(() => null);
      if (!res?.ok) return toast.error("Modification impossible.");
      setMessages((l) => l.map((m) => (m.id === editing.id ? { ...m, text: v, edited: true } : m)));
      setEditing(null);
      setText(localStorage.getItem(draftKey) ?? "");
      return;
    }
    const v = text.trim();
    if (!v && !photo) return;
    const p: Pending = { tempId: crypto.randomUUID(), text: v, photo, status: "sending" };
    stickBottom.current = true;
    setPending((l) => [...l, p]);
    setText("");
    localStorage.removeItem(draftKey);
    deliver(p);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await deleteFn({ data: { eventId, id: toDelete.id } }).catch(() => null);
    if (!res?.ok) toast.error("Suppression impossible.");
    else setMessages((l) => l.map((m) => (m.id === toDelete.id ? { ...m, deleted: true, text: null, photoUrl: null } : m)));
    setToDelete(null);
  };

  const toggleNotif = async () => {
    if (!meta) return;
    const next = !meta.notif;
    await prefFn({ data: { eventId, enabled: next } });
    setMeta({ ...meta, notif: next });
    toast.success(next ? "Notifications Messages : toutes" : "Notifications Messages : désactivées");
  };

  if (state === "loading") return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (state === "denied")
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="font-semibold">Discussion indisponible</p>
        <p className="mt-1 text-sm text-muted-foreground">Elle est désactivée ou réservée aux participants ayant accepté l'invitation.</p>
        <Link to="/app/events/$eventId" params={{ eventId }} className="mt-4 inline-block text-sm underline">Retour à l'événement</Link>
      </div>
    );

  let lastDay = "";
  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b-2 border-primary bg-card px-2 py-2">
        <Link to="/app/events/$eventId" params={{ eventId }} aria-label="Retour" className="grid h-11 w-11 place-items-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{meta?.title}</p>
          <h1 className="font-serif text-lg leading-tight">Messages</h1>
          <p className="text-xs text-muted-foreground">{meta?.count} participant{(meta?.count ?? 0) > 1 ? "s" : ""}</p>
        </div>
        <button onClick={toggleNotif} aria-label="Notifications" className="grid h-11 w-11 place-items-center rounded-full hover:bg-accent">
          {meta?.notif ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </button>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-background px-3 py-4">
        {loadingMore && <p className="text-center text-xs text-muted-foreground">Chargement…</p>}
        {messages.length === 0 && pending.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-4xl">💬</p>
              <p className="mt-2 font-serif text-lg">La discussion est ouverte !</p>
              <p className="text-sm text-muted-foreground">Échangez ici avec tous les participants de votre événement.</p>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.authorUserId === user?.id;
          const d = day(m.createdAt);
          const showDay = d !== lastDay;
          lastDay = d;
          const canEdit = mine && !m.deleted && !!m.text && meta?.config.allowEdit;
          const canDelete = !m.deleted && ((mine && meta?.config.allowAuthorDelete) || meta?.isOrganizer);
          return (
            <div key={m.id}>
              {showDay && <p className="my-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{d}</p>}
              <div id={`msg-${m.id}`} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-accent text-xs font-bold text-accent-foreground">
                    {m.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl border-2 px-3 py-2 ${m.id === focusId ? "ring-2 ring-secondary" : ""} ${mine ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-2 text-xs">
                    {!mine && <span className="font-semibold">{m.authorName}</span>}
                    <span className="opacity-70">{time(m.createdAt)}</span>
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Actions" className="-my-2 ml-auto grid h-9 w-9 place-items-center rounded-full opacity-70 hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && <DropdownMenuItem onClick={() => { setEditing(m); setText(m.text ?? ""); }}>Modifier</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem onClick={() => setToDelete(m)}>{mine ? "Supprimer" : "Supprimer le message"}</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {m.deleted ? (
                    <p className="text-sm italic opacity-70">Message supprimé</p>
                  ) : (
                    <>
                      {m.photoUrl && <img src={m.photoUrl} alt="Photo partagée" loading="lazy" className="mt-1 max-h-80 w-full rounded-lg object-cover" />}
                      {m.text && <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>}
                      {m.edited && <p className="text-[11px] opacity-60">modifié</p>}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {pending.map((p) => (
          <div key={p.tempId} className="flex flex-row-reverse">
            <div className="max-w-[80%] rounded-2xl border-2 border-dashed border-primary bg-card px-3 py-2 text-sm">
              {p.photo && <p>📷 Photo</p>}
              {p.text && <p className="whitespace-pre-wrap break-words">{p.text}</p>}
              {p.status === "sending" ? (
                <p className="text-[11px] text-muted-foreground">Envoi…</p>
              ) : (
                <button onClick={() => deliver(p)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-destructive">
                  Message non envoyé · <RotateCw className="h-3 w-3" /> Réessayer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t-2 border-primary bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {editing && (
          <div className="mb-1 flex items-center justify-between px-2 text-xs">
            <span>Modification du message</span>
            <button className="underline" onClick={() => { setEditing(null); setText(localStorage.getItem(draftKey) ?? ""); }}>Annuler</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {meta?.config.allowPhotos && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="Ajouter" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-primary">
                <Plus className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => fileRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Photo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) submit(f); }} />
          <Textarea
            value={text}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); submit(); } }}
            placeholder="Écrire un message..."
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none"
          />
          <Button onClick={() => submit()} size="icon" aria-label="Envoyer" className="h-11 w-11 shrink-0 rounded-full">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>« Message supprimé » restera visible dans la discussion.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
