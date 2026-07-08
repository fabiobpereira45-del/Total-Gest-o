import { supabase } from "./supabase";

export interface TenantData {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string;
  email: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cor_primaria: string;
  cor_secundaria: string;
}

const TENANT_KEY = "total_gestao_tenant";

export function getTenantFromStorage(): TenantData | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(TENANT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setTenantToStorage(tenant: TenantData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

export function clearTenantFromStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TENANT_KEY);
}

export async function loginTenant(email: string, senha: string): Promise<{ tenant: TenantData | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { tenant: null, error: "E-mail ou senha inválidos." };

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("email", email)
      .eq("ativo", true)
      .maybeSingle();

    if (tenantError || !tenant) {
      await supabase.auth.signOut();
      return { tenant: null, error: "Organização não encontrada ou inativa." };
    }

    setTenantToStorage(tenant);
    return { tenant, error: null };
  } catch {
    return { tenant: null, error: "Erro ao conectar. Tente novamente." };
  }
}

export async function logoutTenant(): Promise<void> {
  clearTenantFromStorage();
  await supabase.auth.signOut();
}

export async function gerarMatricula(tenantId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("gerar_matricula", {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data as string;
  } catch {
    return null;
  }
}
