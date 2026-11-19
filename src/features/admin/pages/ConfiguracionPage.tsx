import * as React from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";
import { adminWrite } from "@/lib/api";
import { isStandaloneDisplay, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from "@/features/admin/pushConfig";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type PushState = "loading" | "unsupported" | "need-install" | "denied" | "off" | "on";

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/admin/");
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

export default function ConfiguracionPage() {
  const { signOut } = useAuth();
  const access = useAdminAccess();
  const [pushState, setPushState] = React.useState<PushState>("loading");
  const [busy, setBusy] = React.useState(false);

  const refreshPushState = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (!isStandaloneDisplay()) {
      setPushState("need-install");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    try {
      const sub = await getExistingSubscription();
      setPushState(sub ? "on" : "off");
    } catch {
      setPushState("off");
    }
  }, []);

  React.useEffect(() => {
    void refreshPushState();
  }, [refreshPushState]);

  async function enablePush() {
    setBusy(true);
    try {
      if (!isStandaloneDisplay()) {
        setPushState("need-install");
        toast({
          title: "Instalá la app primero",
          description: "Las notificaciones push solo funcionan con bridgearg instalada (Agregar a inicio / Instalar).",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "off");
        toast({
          title: "Permiso no concedido",
          description: "Sin permiso del sistema no se pueden enviar notificaciones a este dispositivo.",
          variant: "destructive",
        });
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration("/admin/");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" });
      }
      await navigator.serviceWorker.ready;

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));

      const json = sub.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) {
        throw new Error("La suscripción del navegador no trajo keys");
      }

      await adminWrite("push.subscribe", {
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      });

      setPushState("on");
      toast({ title: "Notificaciones activadas en este dispositivo" });
    } catch (e) {
      toast({
        title: "No se pudieron activar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
      await refreshPushState();
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        try {
          await adminWrite("push.unsubscribe", { endpoint });
        } catch {
          /* still unsubscribe locally */
        }
        await sub.unsubscribe();
      }
      setPushState("off");
      toast({ title: "Notificaciones desactivadas en este dispositivo" });
    } catch (e) {
      toast({
        title: "No se pudieron desactivar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Cuenta y preferencias del panel.</p>
      </div>

      <section className="space-y-3 border border-bridge-black/15 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cuenta</h2>
        <p className="text-sm">
          Sesión: <span className="font-medium">{access.email ?? "—"}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-bridge-black/20"
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </Button>
      </section>

      <section className="space-y-3 border border-bridge-black/15 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notificaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Alertas nativas en este dispositivo (además de Telegram), solo de las secciones que podés ver.
        </p>

        {pushState === "loading" ? (
          <p className="text-sm text-muted-foreground">Comprobando…</p>
        ) : null}

        {pushState === "unsupported" ? (
          <p className="text-sm text-muted-foreground">
            Este navegador no soporta Web Push. Probá Safari/Chrome en un dispositivo compatible.
          </p>
        ) : null}

        {pushState === "need-install" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Para recibir push, instalá bridgearg (Agregar a inicio en iOS, o Instalar app en Android) y volvé a
              abrir desde el ícono.
            </p>
            <Button type="button" variant="outline" className="border-bridge-black/20" disabled>
              Activar notificaciones
            </Button>
          </div>
        ) : null}

        {pushState === "denied" ? (
          <p className="text-sm text-muted-foreground">
            El permiso está bloqueado en el sistema. Activá notificaciones para bridgearg en Ajustes del dispositivo.
          </p>
        ) : null}

        {pushState === "off" ? (
          <div className="space-y-2">
            <p className="text-sm">
              Estado: <span className="font-medium">desactivadas</span> en este dispositivo
            </p>
            <Button
              type="button"
              className="bg-bridge-black text-[#fcf8ea]"
              disabled={busy}
              onClick={() => void enablePush()}
            >
              Activar notificaciones en este dispositivo
            </Button>
          </div>
        ) : null}

        {pushState === "on" ? (
          <div className="space-y-2">
            <p className="text-sm">
              Estado: <span className="font-medium">activadas</span> en este dispositivo
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-bridge-black/20"
              disabled={busy}
              onClick={() => void disablePush()}
            >
              Desactivar en este dispositivo
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
