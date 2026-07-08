"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import FormularioBatismo from "@/components/cadastro/FormularioBatismo";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generatePDF, generateIndividualPDF } from "@/lib/pdf-generator";
import { generateExcel } from "@/lib/excel-generator";
import { 
  FileText, 
  FileSpreadsheet, 
  Search, 
  Eye, 
  Trash2, 
  Plus, 
  ListFilter,
  X
} from "lucide-react";

interface Inscricao {
  id: string;
  matricula?: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  data_consagracao?: string;
  telefone: string;
  igreja: string;
  pastor: string;
  cargo: string;
  funcao: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  estado_civil: string;
  nome_pai?: string;
  nome_mae: string;
  naturalidade: string;
  rg: string;
  data_batismo: string;
  foto_url?: string;
  criado_em?: string;
}

export default function CadastroPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [activeTab, setActiveTab] = useState<"lista" | "novo">("lista");
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroIgreja, setFiltroIgreja] = useState("");

  const fetchInscricoes = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("inscricoes_batismo")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true });

      if (filtroNome) query = query.ilike("nome", `%${filtroNome}%`);
      if (filtroCpf) query = query.ilike("cpf", `%${filtroCpf}%`);
      if (filtroIgreja) query = query.ilike("igreja", `%${filtroIgreja}%`);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setInscricoes(data || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar lista.");
    } finally {
      setLoading(false);
    }
  }, [filtroNome, filtroCpf, filtroIgreja]);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (activeTenant) {
      setTenant(activeTenant);
      fetchInscricoes(activeTenant.id);
    }
  }, [fetchInscricoes]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o registro de ${name}?`)) return;
    try {
      const { error: deleteError } = await supabase
        .from("inscricoes_batismo")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      alert("Registro removido com sucesso.");
      if (tenant) fetchInscricoes(tenant.id);
    } catch (err: any) {
      alert(err.message || "Erro ao remover registro.");
    }
  };

  const handleExportPDF = () => {
    if (!tenant) return;
    generatePDF(inscricoes, tenant.nome, {
      nome: filtroNome || undefined,
      cpf: filtroCpf || undefined,
      igreja: filtroIgreja || undefined,
    });
  };

  const handleExportExcel = () => {
    generateExcel(inscricoes);
  };

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-mesh pl-0 sm:pl-[240px]">
      <Sidebar />

      <main className="p-6 sm:p-10 max-w-7xl mx-auto animate-fade-in">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              1. Cadastro (Batismo)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerenciamento completo das fichas de batismo da organização.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("lista")}
              className={`btn-secondary py-2 px-4 text-xs font-bold uppercase rounded-xl ${
                activeTab === "lista" ? "bg-white/10 text-white" : "text-slate-400"
              }`}
            >
              Listar Registros
            </button>
            <button
              onClick={() => setActiveTab("novo")}
              className={`btn-primary py-2 px-4 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5`}
            >
              <Plus size={14} />
              Novo Form
            </button>
          </div>
        </header>

        {activeTab === "novo" ? (
          <div className="max-w-4xl mx-auto">
            <FormularioBatismo />
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
                  onClick={() => fetchInscricoes(tenant.id)}
                  className="flex-1 btn-primary justify-center py-2.5"
                >
                  Filtrar
                </button>
                <button
                  onClick={() => {
                    setFiltroNome("");
                    setFiltroCpf("");
                    setFiltroIgreja("");
                    setTimeout(() => fetchInscricoes(tenant.id), 50);
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
                {inscricoes.length} registros encontrados
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={inscricoes.length === 0}
                  className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 border-indigo-500/20 text-indigo-300"
                >
                  <FileText size={14} />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={inscricoes.length === 0}
                  className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 border-emerald-500/20 text-emerald-300"
                >
                  <FileSpreadsheet size={14} />
                  Exportar Excel
                </button>
              </div>
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
                      <th>Cargo/Função</th>
                      <th>Telefone</th>
                      <th>Igreja</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-500">
                          Carregando cadastros...
                        </td>
                      </tr>
                    ) : inscricoes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-500">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    ) : (
                      inscricoes.map((item) => (
                        <tr key={item.id} className="hover:bg-white/1">
                          <td className="font-semibold text-indigo-400 tracking-wider">
                            {item.matricula || "-"}
                          </td>
                          <td className="font-medium text-white uppercase">{item.nome}</td>
                          <td>{item.cpf}</td>
                          <td className="text-xs font-semibold text-slate-300">
                            {item.cargo} / {item.funcao}
                          </td>
                          <td>{item.telefone}</td>
                          <td className="text-xs">{item.igreja}</td>
                          <td>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedInscricao(item)}
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
      {selectedInscricao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative flex flex-col">
            <button
              onClick={() => setSelectedInscricao(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 p-1.5 rounded-xl border border-white/5"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-white uppercase tracking-tight border-b border-white/5 pb-3 mb-6">
              Ficha de Cadastro Individual
            </h2>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {selectedInscricao.foto_url ? (
                <div className="w-32 h-40 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-md flex-shrink-0 mx-auto sm:mx-0">
                  <img
                    src={selectedInscricao.foto_url}
                    alt="Foto do Membro"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-40 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-md flex-shrink-0 mx-auto sm:mx-0 flex items-center justify-center text-slate-500">
                  <span className="text-xxs uppercase font-bold">Sem Foto</span>
                </div>
              )}

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-slate-300">
                <div className="sm:col-span-2">
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Nome</span>
                  <span className="text-sm font-bold text-white uppercase">{selectedInscricao.nome}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Matrícula</span>
                  <span className="text-sm font-bold text-indigo-400 tracking-wider">{selectedInscricao.matricula || "-"}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">CPF</span>
                  <span className="text-white">{selectedInscricao.cpf}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">RG</span>
                  <span className="text-white uppercase">{selectedInscricao.rg || "-"}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Telefone</span>
                  <span className="text-white">{selectedInscricao.telefone}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Data Nasc.</span>
                  <span className="text-white">
                    {new Date(selectedInscricao.data_nascimento).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Naturalidade</span>
                  <span className="text-white uppercase">{selectedInscricao.naturalidade || "-"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/5 pt-4 mb-6">
              <div className="space-y-3 text-xs font-semibold text-slate-300">
                <h4 className="text-xxs font-black text-indigo-400 uppercase tracking-wider">Filiação & Endereço</h4>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Nome da Mãe</span>
                  <span className="text-white uppercase">{selectedInscricao.nome_mae}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Nome do Pai</span>
                  <span className="text-white uppercase">{selectedInscricao.nome_pai || "-"}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Rua</span>
                  <span className="text-white uppercase">
                    {selectedInscricao.rua}, Nº {selectedInscricao.numero}
                  </span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Bairro</span>
                  <span className="text-white uppercase">{selectedInscricao.bairro}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Cidade / Estado</span>
                  <span className="text-white uppercase">
                    {selectedInscricao.cidade} / {selectedInscricao.estado}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs font-semibold text-slate-300">
                <h4 className="text-xxs font-black text-indigo-400 uppercase tracking-wider">Histórico Eclesial</h4>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Igreja</span>
                  <span className="text-white uppercase">{selectedInscricao.igreja}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Pastor</span>
                  <span className="text-white uppercase">{selectedInscricao.pastor}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Cargo</span>
                  <span className="text-white uppercase">{selectedInscricao.cargo}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Função</span>
                  <span className="text-white uppercase">{selectedInscricao.funcao}</span>
                </div>
                <div>
                  <span className="text-xxs font-bold text-slate-500 block uppercase">Data Batismo</span>
                  <span className="text-white">
                    {selectedInscricao.data_batismo
                      ? new Date(selectedInscricao.data_batismo).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-white/5 pt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  generateIndividualPDF(selectedInscricao, tenant.nome);
                }}
                className="btn-primary py-2 text-xs uppercase"
              >
                Ficha PDF
              </button>
              <button
                onClick={() => setSelectedInscricao(null)}
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
