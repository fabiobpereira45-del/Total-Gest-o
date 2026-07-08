"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { 
  UserPlus, 
  Users, 
  Contact, 
  IdCard, 
  Award,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [counts, setCounts] = useState({ batismos: 0, membrosGerais: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (!activeTenant) {
      router.push("/login");
    } else {
      setTenant(activeTenant);
      fetchStats(activeTenant.id);
    }
  }, [router]);

  const fetchStats = async (tenantId: string) => {
    try {
      const { count: batismoCount } = await supabase
        .from("inscricoes_batismo")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      const { count: membrosCount } = await supabase
        .from("membros_gerais")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      setCounts({
        batismos: batismoCount || 0,
        membrosGerais: membrosCount || 0
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return null;

  const modules = [
    {
      id: "cadastro",
      title: "1. Cadastro (Batismo)",
      description: "Formulário completo de inscrições para batismo com foto, igreja, pastor e histórico.",
      href: "/cadastro",
      icon: UserPlus,
      color: "from-blue-600/30 to-cyan-600/30 hover:border-blue-500/50",
      iconColor: "text-blue-400",
      badge: "Inalterado"
    },
    {
      id: "cadastro-geral",
      title: "2. Cadastro Geral",
      description: "Formulário rápido contendo Nome, CPF, Data de Nascimento, Foto e Matrícula automática.",
      href: "/cadastro-geral",
      icon: Users,
      color: "from-indigo-600/30 to-purple-600/30 hover:border-indigo-500/50",
      iconColor: "text-indigo-400",
      badge: "Novo Módulo"
    },
    {
      id: "credencial",
      title: "3. Credencial de Evento",
      description: "Geração de crachás de identificação com dados de membros de ambos os cadastros.",
      href: "/credencial",
      icon: Contact,
      color: "from-emerald-600/30 to-teal-600/30 hover:border-emerald-500/50",
      iconColor: "text-emerald-400",
      badge: "Customizável"
    },
    {
      id: "carteira",
      title: "4. Carteira de Membro",
      description: "Emissão de carteirinhas profissionais frente e verso, no tamanho padrão de cartão de crédito.",
      href: "/carteira",
      icon: IdCard,
      color: "from-amber-600/30 to-orange-600/30 hover:border-amber-500/50",
      iconColor: "text-amber-400",
      badge: "Tamanho CR80"
    },
    {
      id: "certificado",
      title: "5. Certificados",
      description: "Geração de certificados de honra, conclusão ou batismo com múltiplos layouts premium.",
      href: "/certificado",
      icon: Award,
      color: "from-rose-600/30 to-pink-600/30 hover:border-rose-500/50",
      iconColor: "text-rose-400",
      badge: "Premium"
    }
  ];

  return (
    <div className="min-h-screen bg-mesh pl-0 sm:pl-[240px]">
      <Sidebar />
      
      <main className="p-6 sm:p-10 max-w-7xl mx-auto animate-fade-in">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              Bem-vindo, {tenant.nome}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerenciamento integrado de membros, credenciais e certificados.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass-card py-2 px-5 text-center min-w-[120px]">
              <span className="text-xxs font-bold text-slate-400 tracking-wider block uppercase">Batismos</span>
              <span className="text-2xl font-bold text-indigo-400">{loading ? "..." : counts.batismos}</span>
            </div>
            <div className="glass-card py-2 px-5 text-center min-w-[120px]">
              <span className="text-xxs font-bold text-slate-400 tracking-wider block uppercase">Geral</span>
              <span className="text-2xl font-bold text-purple-400">{loading ? "..." : counts.membrosGerais}</span>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.id} href={m.href}>
                <div className={`module-card bg-gradient-to-br ${m.color} h-full flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${m.iconColor}`}>
                        <Icon size={24} />
                      </div>
                      <span className="badge badge-primary">{m.badge}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase">{m.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{m.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mt-6 group-hover:text-white">
                    <span>Acessar Módulo</span>
                    <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
