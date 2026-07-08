"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loginTenant, getTenantFromStorage } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Redireciona se já estiver logado
    const tenant = getTenantFromStorage();
    if (tenant) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { tenant, error: loginError } = await loginTenant(email, password);
      if (loginError) {
        // Fallback para desenvolvimento caso o banco de dados não esteja configurado ainda
        if (email === "demo@totalgestao.com" && password === "demo123") {
          const mockTenant = {
            id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            nome: "ORGANIZAÇÃO DEMO",
            slug: "demo",
            email: "demo@totalgestao.com",
            cor_primaria: "#6366f1",
            cor_secundaria: "#8b5cf6",
          };
          localStorage.setItem("total_gestao_tenant", JSON.stringify(mockTenant));
          router.push("/dashboard");
          return;
        }
        setError(loginError);
      } else if (tenant) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Erro ao tentar entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const slug = orgSlug.toLowerCase().replace(/[^a-z0-9]/g, "");

    try {
      // 1. Cadastra o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        // 2. Cria o Tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .insert([
            {
              nome: orgName.toUpperCase(),
              slug: slug,
              email: email,
              cor_primaria: "#6366f1",
              cor_secundaria: "#8b5cf6",
              ativo: true
            }
          ])
          .select()
          .single();

        if (tenantError) {
          throw new Error(tenantError.message);
        }

        // 3. Cria o usuário administrador
        const { error: adminError } = await supabase
          .from("usuarios_admin")
          .insert([
            {
              tenant_id: tenantData.id,
              email: email,
              nome: orgName.toUpperCase() + " ADMIN",
              role: "admin"
            }
          ]);

        if (adminError) {
          throw new Error(adminError.message);
        }

        setMessage("Organização cadastrada com sucesso! Faça login para continuar.");
        setIsSignUp(false);
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar organização.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight gradient-text mb-2">
            TOTAL GESTÃO
          </h1>
          <p className="text-sm text-slate-400">
            {isSignUp
              ? "Crie uma conta para sua empresa ou organização"
              : "Acesse a plataforma de gestão da sua organização"}
          </p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 bg-green-950/50 border border-green-500/30 text-green-200 px-4 py-3 rounded-xl text-sm font-medium">
              {message}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label className="form-label">Nome da Organização/Empresa</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""));
                    }}
                    placeholder="Ex: Igreja Central"
                    className="form-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-label">Slug de Acesso (Link)</label>
                  <input
                    type="text"
                    required
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="ex-igreja-central"
                    className="form-input"
                    style={{ textTransform: "lowercase" }}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="form-label">E-mail Administrativo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                className="form-input"
                style={{ textTransform: "none" }}
              />
            </div>

            <div className="space-y-2">
              <label className="form-label">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ textTransform: "none" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center h-12 text-base mt-2"
            >
              {loading
                ? "Processando..."
                : isSignUp
                ? "Criar Organização"
                : "Entrar na Plataforma"}
            </button>
          </form>

          <div className="divider my-6" />

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSignUp
                ? "Já possui uma conta? Faça login"
                : "Criar nova conta de organização"}
            </button>
          </div>
        </div>

        {!isSignUp && (
          <div className="mt-6 text-center text-xs text-slate-500 bg-slate-900/30 py-2 px-4 rounded-lg border border-slate-800">
            Modo de Demonstração local ativo.
            <br />
            Use E-mail: <code className="text-slate-300">demo@totalgestao.com</code> / Senha: <code className="text-slate-300">demo123</code>
          </div>
        )}
      </div>
    </div>
  );
}
