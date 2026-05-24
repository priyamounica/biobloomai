import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";

import {
  adminStats,
  claimFirstAdmin,
  createUser,
  deleteAiLog,
  deleteUser,
  getMyAdminStatus,
  listAiLogs,
  listUsers,
  setRole,
  updateAiLog,
  updateProfile,
} from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <CenterMsg><Loader2 className="h-5 w-5 animate-spin" /></CenterMsg>;
  }
  if (!user) {
    return (
      <CenterMsg>
        <div className="text-center space-y-3">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="font-serif text-2xl">Admin portal</h1>
          <p className="text-muted-foreground text-sm">Please sign in to continue.</p>
          <Button asChild className="rounded-full"><Link to="/login">Sign in</Link></Button>
        </div>
      </CenterMsg>
    );
  }
  return <AdminGate />;
}

function AdminGate() {
  const getStatus = useServerFn(getMyAdminStatus);
  const claim = useServerFn(claimFirstAdmin);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => getStatus(),
  });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      toast.success("You are now an admin.");
      qc.invalidateQueries({ queryKey: ["admin-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <CenterMsg><Loader2 className="h-5 w-5 animate-spin" /></CenterMsg>;
  if (error) return <CenterMsg><p className="text-destructive text-sm">{(error as Error).message}</p></CenterMsg>;

  if (!data?.isAdmin) {
    return (
      <CenterMsg>
        <div className="max-w-md text-center space-y-4">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="font-serif text-2xl">Admin access required</h1>
          {data?.adminCount === 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                No admin exists yet. Claim admin access for this workspace.
              </p>
              <Button
                onClick={() => claimMut.mutate()}
                disabled={claimMut.isPending}
                className="rounded-full"
              >
                {claimMut.isPending ? "Claiming…" : "Become first admin"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask an existing admin to grant you access.
            </p>
          )}
        </div>
      </CenterMsg>
    );
  }

  return <AdminDashboard />;
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center px-4">{children}</div>;
}

/* ============== Dashboard ============== */

function AdminDashboard() {
  const getStats = useServerFn(adminStats);
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => getStats() });

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-serif text-4xl">Admin portal</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and monitor AI activity.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Users" value={stats?.profiles ?? "—"} />
        <Stat label="AI calls" value={stats?.logs ?? "—"} />
        <Stat label="Flagged" value={stats?.flagged ?? "—"} tone={stats && stats.flagged > 0 ? "warn" : "ok"} />
        <Stat label="Errors" value={stats?.errors ?? "—"} tone={stats && stats.errors > 0 ? "warn" : "ok"} />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="logs">AI activity</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-serif ${tone === "warn" ? "text-terracotta" : ""}`}>{value}</div>
    </div>
  );
}

/* ============== Users tab ============== */

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  profile: { display_name: string | null; avatar_url: string | null; login_method: string } | null;
  roles: string[];
};

function UsersTab() {
  const fetchUsers = useServerFn(listUsers);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.users.length ?? 0} users</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-full">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} className="rounded-full">
            <UserPlus className="h-4 w-4" /> New user
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            )}
            {data?.users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.profile?.display_name || u.email || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{u.provider}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">user</span>}
                    {u.roles.map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(u)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && <EditUserDialog user={editing} onClose={() => { setEditing(null); refresh(); }} />}
      {creating && <CreateUserDialog onClose={() => { setCreating(false); refresh(); }} />}
      {deleting && <DeleteUserDialog user={deleting} onClose={() => { setDeleting(null); refresh(); }} />}
    </div>
  );
}

function EditUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.profile?.display_name ?? "");
  const [loginMethod, setLoginMethod] = useState(user.profile?.login_method ?? "email");
  const [roles, setRoles] = useState<Record<string, boolean>>({
    admin: user.roles.includes("admin"),
    moderator: user.roles.includes("moderator"),
    user: user.roles.includes("user"),
  });

  const upd = useServerFn(updateProfile);
  const setR = useServerFn(setRole);

  const save = useMutation({
    mutationFn: async () => {
      await upd({ data: { id: user.id, display_name: displayName, login_method: loginMethod } });
      for (const role of ["admin", "moderator", "user"] as const) {
        const enabled = roles[role];
        const was = user.roles.includes(role);
        if (enabled !== was) {
          await setR({ data: { user_id: user.id, role, enabled } });
        }
      }
    },
    onSuccess: () => { toast.success("User updated"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Login method</Label>
            <Input value={loginMethod} onChange={(e) => setLoginMethod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="space-y-2">
              {(["admin", "moderator", "user"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roles[r]}
                    onCheckedChange={(c) => setRoles((p) => ({ ...p, [r]: !!c }))}
                  />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const create = useServerFn(createUser);

  const mut = useMutation({
    mutationFn: () => create({ data: { email, password, display_name: name || undefined } }),
    onSuccess: () => { toast.success("User created"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Account will be created with email pre-confirmed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Password (≥ 8 chars)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-2"><Label>Display name (optional)</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !email || password.length < 8}>
            {mut.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const del = useServerFn(deleteUser);
  const mut = useMutation({
    mutationFn: () => del({ data: { id: user.id } }),
    onSuccess: () => { toast.success("User deleted"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Delete user?
          </DialogTitle>
          <DialogDescription>
            Permanently delete <b>{user.email}</b> and all associated data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== AI logs tab ============== */

type AiLog = {
  id: string;
  user_id: string | null;
  kind: string;
  model: string;
  input_preview: string | null;
  output_preview: string | null;
  status: string;
  error: string | null;
  flagged: boolean;
  flag_reason: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number | null;
  created_at: string;
};

function LogsTab() {
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const fetchLogs = useServerFn(listAiLogs);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", flaggedOnly],
    queryFn: () => fetchLogs({ data: { flaggedOnly } }),
  });
  const [viewing, setViewing] = useState<AiLog | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-logs"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={flaggedOnly} onCheckedChange={setFlaggedOnly} />
          Show flagged only
        </label>
        <Button variant="outline" size="sm" onClick={refresh} className="rounded-full">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
            )}
            {data?.logs.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No AI activity yet.</TableCell></TableRow>
            )}
            {data?.logs.map((l) => (
              <TableRow key={l.id} className={l.flagged ? "bg-terracotta/5" : undefined}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>
                <TableCell><code className="text-xs">{l.kind}</code></TableCell>
                <TableCell className="text-xs">{l.model}</TableCell>
                <TableCell>
                  {l.status === "error" ? (
                    <Badge variant="destructive">error</Badge>
                  ) : l.flagged ? (
                    <Badge className="bg-terracotta text-terracotta-foreground"><Flag className="h-3 w-3" /> flagged</Badge>
                  ) : (
                    <Badge variant="secondary">ok</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {l.tokens_in ?? "—"} / {l.tokens_out ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setViewing(l)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {viewing && <LogDialog log={viewing} onClose={() => { setViewing(null); refresh(); }} />}
    </div>
  );
}

function LogDialog({ log, onClose }: { log: AiLog; onClose: () => void }) {
  const [flagged, setFlagged] = useState(log.flagged);
  const [reason, setReason] = useState(log.flag_reason ?? "");
  const upd = useServerFn(updateAiLog);
  const del = useServerFn(deleteAiLog);

  const save = useMutation({
    mutationFn: () => upd({ data: { id: log.id, flagged, flag_reason: reason || null } }),
    onSuccess: () => { toast.success("Log updated"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { id: log.id } }),
    onSuccess: () => { toast.success("Log deleted"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{log.kind}</DialogTitle>
          <DialogDescription>
            {log.model} · {new Date(log.created_at).toLocaleString()} · {log.duration_ms ?? "—"}ms
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {log.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{log.error}</div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Input</Label>
            <pre className="mt-1 whitespace-pre-wrap text-xs bg-muted/50 rounded-md p-3">{log.input_preview ?? "—"}</pre>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Output</Label>
            <pre className="mt-1 whitespace-pre-wrap text-xs bg-muted/50 rounded-md p-3">{log.output_preview ?? "—"}</pre>
          </div>
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={flagged} onCheckedChange={setFlagged} />
              Flag for review
            </label>
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!flagged}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending} className="text-destructive mr-auto">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void Plus;
