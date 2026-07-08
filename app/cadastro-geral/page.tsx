"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import FormularioCadastroGeral from "@/components/cadastro-geral/FormularioCadastroGeral";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Search, 
  Eye, 
  Trash2, 
  Plus, 
  X
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MembroGeral {
  id: string;
  matricula?: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  foto_url?: string;
  criado_em?: string;
}

export default function CadastroGeralPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [activeTab, setActiveTab] = useState<"lista" | "novo">("lista");
  const [membros, setMembros] = useState<MembroGeral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMembro, setSelectedMembro] = useState<MembroGeral | null>(null);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCpf, setFiltroCpf] = useState("");

  const fetchMembros = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("membros_gerais")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true });

      if (filtroNome) query = query.ilike("nome", `%${filtroNome}%`);
      if (filtroCpf) query = query.ilike("cpf", `%${filtroCpf}%`);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setMembros(data || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  }, [filtroNome, filtroCpf]);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (activeTenant) {
      setTenant(activeTenant);
      fetchMembros(activeTenant.id);
    }
  }, [fetchMembros]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o cadastro de ${name}?`)) return;
    try {
      const { error: deleteError } = await supabase
        .from("membros_gerais")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      alert("Cadastro removido.");
      if (tenant) fetchMembros(tenant.id);
    } catch (err: any) {
      alert(err.message || "Erro ao remover cadastro.");
    }
  };

  const handleExportPDF = () => {
    if (!tenant) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(tenant.nome.toUpperCase(), 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("RELATÓRIO - CADASTRO GERAL DE MEMBROS", 105, 28, { align: "center" });

    const headers = [["MATRÍCULA", "NOME COMPLETO", "CPF", "IDADE"]];
    const data = membros.map((m) => {
      const nascimento = new Date(m.data_nascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mDiff = hoje.getMonth() - nascimento.getMonth();
      if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
      return [
        m.matricula || "-",
        m.nome.toUpperCase(),
        m.cpf,
        `${idade} ANOS`
      ];
    });

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 40,
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`cadastro-geral-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-mesh pl-0 sm:pl-[240px]">
      <Sidebar />

      <main className="p-6 sm:p-10 max-w-7xl mx-auto animate-fade-in">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              2. Cadastro Geral
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ficha cadastral simplificada com Nome, CPF, Data de Nascimento e Foto.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("lista")}
              className={`btn-secondary py-2 px-4 text-xs font-bold uppercase rounded-xl ${
                activeTab === "lista" ? "bg-white/10 text-white" : "text-slate-400"
              }`}
            >
              Listar Cadastros
            </button>
            <button
              onClick={() => setActiveTab("novo")}
              className={`btn-primary py-2 px-4 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5`}
            >
              <Plus size={14} />
              Novo Cadastro
            </button>
          </div>
        </header>

        {activeTab === "novo" ? (
          <div className="max-w-xl mx-auto">
            <FormularioCadastroGeral />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="form-label">Buscar por Nome</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="DIGITE O NOME..."
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label">Buscar por CPF</label>
                <input
                  type="text"
                  value={filtroCpf}
                  onChange={(e) => setFiltroCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="form-input"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => fetchMembros(tenant.id)}
                  className="flex-1 btn-primary justify-center py-2.5"
                >
                  Filtrar
                </button>
                <button
                  onClick={() => {
                    setFiltroNome("");
                    setFiltroCpf("");
                    setTimeout(() => fetchMembros(tenant.id), 50);
                  }}
                  className="btn-secondary py-2.5"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Ações da Lista */}
            <div className="flex justify-between items-center bg-white/2 border border-white/5 rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {membros.length} registros encontrados
              </span>
              <button
                onClick={handleExportPDF}
                disabled={membros.length === 0}
                className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 border-indigo-500/20 text-indigo-300"
              >
                <FileText size={14} />
                Exportar PDF
              </button>
            </div>

            {/* Tabela de Resultados */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Data Nasc.</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          Carregando...
                        </td>
                      </tr>
                    ) : membros.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          Nenhum cadastro encontrado.
                        </td>
                      </tr>
                    ) : (
                      membros.map((item) => (
                        <tr key={item.id} className="hover:bg-white/1">
                          <td className="font-semibold text-indigo-400 tracking-wider">
                            {item.matricula || "-"}
                          </td>
                          <td className="font-medium text-white uppercase">{item.nome}</td>
                          <td>{item.cpf}</td>
                          <td>
                            {new Date(item.data_nascimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedMembro(item)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                                title="Ver Ficha"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.nome)}
                                className="p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 rounded-lg text-red-400"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Ficha Individual */}
      {selectedMembro && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative flex flex-col">
            <button
              onClick={() => setSelectedMembro(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 p-1.5 rounded-xl border border-white/5"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-white uppercase tracking-tight border-b border-white/5 pb-3 mb-6">
              Visualizar Cadastro Geral
            </h2>

            <div className="flex flex-col items-center text-center gap-4 mb-6">
              {selectedMembro.foto_url ? (
                <div className="w-32 h-40 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-md">
                  <img
                    src={selectedMembro.foto_url}
                    alt="Foto"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-40 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-md flex items-center justify-center text-slate-500">
                  <span className="text-xxs uppercase font-bold">Sem Foto</span>
                </div>
              )}

              <div className="space-y-2 w-full text-left bg-white/1 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Nome</span>
                  <span className="text-sm font-bold text-white uppercase">{selectedMembro.nome}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Matrícula</span>
                  <span className="text-sm font-bold text-indigo-400 tracking-wider">{selectedMembro.matricula || "-"}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">CPF</span>
                  <span className="text-white">{selectedMembro.cpf}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Data Nasc.</span>
                  <span className="text-white">
                    {new Date(selectedMembro.data_nascimento).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMembro(null)}
                className="btn-secondary py-2 text-xs uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
