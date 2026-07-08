"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Search, Contact, Settings, Download, Palette, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";

interface MemberRecord {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  foto_url?: string;
  origem: "BATISMO" | "GERAL";
  cargo?: string;
  funcao?: string;
}

export default function CredencialPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Opções customizáveis
  const [nomeEvento, setNomeEvento] = useState("CONGRESSO NACIONAL");
  const [dataEvento, setDataEvento] = useState("JULHO DE 2026");
  const [localEvento, setLocalEvento] = useState("TEMPLO SEDE");
  const [corFundo, setCorFundo] = useState("#1e1b4b");
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [corAccent, setCorAccent] = useState("#f59e0b");
  const [mostrarFoto, setMostrarFoto] = useState(true);
  const [mostrarMatricula, setMostrarMatricula] = useState(true);
  const [mostrarCargo, setMostrarCargo] = useState(true);
  const [mostrarQrCode, setMostrarQrCode] = useState(true);

  const fetchAllMembers = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      
      // Busca tabela 1
      const { data: batismos, error: batismosError } = await supabase
        .from("inscricoes_batismo")
        .select("id, nome, cpf, matricula, foto_url, cargo, funcao")
        .eq("tenant_id", tenantId);

      if (batismosError) throw batismosError;

      // Busca tabela 2
      const { data: gerais, error: geraisError } = await supabase
        .from("membros_gerais")
        .select("id, nome, cpf, matricula, foto_url")
        .eq("tenant_id", tenantId);

      if (geraisError) throw geraisError;

      const merged: MemberRecord[] = [
        ...(batismos || []).map(b => ({ ...b, origem: "BATISMO" as const })),
        ...(gerais || []).map(g => ({ ...g, origem: "GERAL" as const, cargo: "MEMBRO", funcao: "GERAL" }))
      ];

      // Ordena por nome
      merged.sort((a, b) => a.nome.localeCompare(b.nome));
      setMembers(merged);
      
      if (merged.length > 0 && !selectedMember) {
        setSelectedMember(merged[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMember]);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (activeTenant) {
      setTenant(activeTenant);
      fetchAllMembers(activeTenant.id);
    }
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedMember || !tenant) return;

    // Criar documento PDF com tamanho de crachá padrão (85x120 mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, 120]
    });

    // 1. Fundo
    doc.setFillColor(corFundo);
    doc.rect(0, 0, 85, 120, "F");

    // 2. Faixa decorativa / Detalhe accent
    doc.setFillColor(corAccent);
    doc.rect(0, 0, 85, 8, "F");
    doc.rect(0, 112, 85, 8, "F");

    // 3. Nome do Evento
    doc.setTextColor(corTexto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(nomeEvento.toUpperCase(), 42.5, 18, { align: "center" });

    // 4. Logo / Nome Org
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(tenant.nome.toUpperCase(), 42.5, 23, { align: "center" });

    let currentY = 28;

    // 5. Foto do Membro
    if (mostrarFoto && selectedMember.foto_url) {
      try {
        const proxyImg = new Image();
        proxyImg.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
          proxyImg.onload = resolve;
          proxyImg.onerror = reject;
          proxyImg.src = selectedMember.foto_url!;
        });
        doc.addImage(proxyImg, "JPEG", 27.5, currentY, 30, 36);
        doc.setDrawColor(corAccent);
        doc.setLineWidth(0.5);
        doc.rect(27.5, currentY, 30, 36);
        currentY += 42;
      } catch {
        doc.setDrawColor(corAccent);
        doc.rect(27.5, currentY, 30, 36);
        doc.setFontSize(6);
        doc.text("SEM FOTO", 42.5, currentY + 18, { align: "center" });
        currentY += 42;
      }
    } else {
      currentY += 10;
    }

    // 6. Nome do Membro
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(corAccent);
    doc.text(selectedMember.nome.toUpperCase(), 42.5, currentY, { align: "center" });
    currentY += 6;

    // 7. Cargo / Matrícula
    doc.setTextColor(corTexto);
    if (mostrarCargo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(selectedMember.cargo || "MEMBRO").toUpperCase(), 42.5, currentY, { align: "center" });
      currentY += 5;
    }

    if (mostrarMatricula) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`MATRÍCULA: ${selectedMember.matricula}`, 42.5, currentY, { align: "center" });
      currentY += 5;
    }

    // 8. Local e Data do Evento
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`${localEvento} — ${dataEvento}`.toUpperCase(), 42.5, 106, { align: "center" });

    // Salvar PDF
    const safeName = selectedMember.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`credencial-${safeName}.pdf`);
  };

  const filteredMembers = members.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase()) || 
    m.cpf.includes(search) || 
    m.matricula.toLowerCase().includes(search.toLowerCase())
  );

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-mesh pl-0 sm:pl-[240px]">
      <Sidebar />

      <main className="p-6 sm:p-10 max-w-7xl mx-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
            3. Credencial de Evento
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gere crachás customizados selecionando membros cadastrados de qualquer formulário.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Seletor de Membros (Esquerda) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase">Selecionar Membro</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="PROCURAR MEMBRO..."
                className="form-input pl-10"
              />
            </div>

            <div className="glass-card max-h-[500px] overflow-y-auto divide-y divide-white/5">
              {loading ? (
                <div className="p-4 text-center text-slate-500">Carregando lista...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-500">Nenhum membro encontrado.</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                      selectedMember?.id === m.id ? "bg-indigo-600/20" : "hover:bg-white/2"
                    }`}
                  >
                    {m.foto_url ? (
                      <div className="w-10 h-12 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                        <img src={m.foto_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-12 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-slate-500 text-xxs font-bold">
                        FOTO
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-white uppercase block truncate">{m.nome}</span>
                      <span className="text-xxs font-bold text-slate-500 tracking-wider">
                        {m.matricula} • {m.origem}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Customização (Meio) */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
              <Settings size={16} />
              Opções da Credencial
            </h3>

            <div className="glass-card p-5 space-y-4">
              <div className="space-y-1">
                <label className="form-label">Nome do Evento</label>
                <input
                  type="text"
                  value={nomeEvento}
                  onChange={(e) => setNomeEvento(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="space-y-1">
                <label className="form-label">Data do Evento</label>
                <input
                  type="text"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="space-y-1">
                <label className="form-label">Local do Evento</label>
                <input
                  type="text"
                  value={localEvento}
                  onChange={(e) => setLocalEvento(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Fundo</label>
                  <input
                    type="color"
                    value={corFundo}
                    onChange={(e) => setCorFundo(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Texto</label>
                  <input
                    type="color"
                    value={corTexto}
                    onChange={(e) => setCorTexto(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Destaque</label>
                  <input
                    type="color"
                    value={corAccent}
                    onChange={(e) => setCorAccent(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="divider" />

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarFoto}
                    onChange={(e) => setMostrarFoto(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/10"
                  />
                  <span>Mostrar Foto do Membro</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarMatricula}
                    onChange={(e) => setMostrarMatricula(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/10"
                  />
                  <span>Mostrar Número de Matrícula</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarCargo}
                    onChange={(e) => setMostrarCargo(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/10"
                  />
                  <span>Mostrar Cargo / Função</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview & Download (Direita) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col items-center">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase self-start">Visualização da Credencial</h3>
            
            {selectedMember ? (
              <>
                <div 
                  className="w-[260px] h-[368px] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-between p-4 border border-white/10"
                  style={{ backgroundColor: corFundo, color: corTexto }}
                >
                  {/* Faixa superior */}
                  <div 
                    className="absolute top-0 inset-x-0 h-2.5" 
                    style={{ backgroundColor: corAccent }}
                  />

                  {/* Header Evento */}
                  <div className="text-center pt-2 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                      {nomeEvento}
                    </span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                      {tenant.nome}
                    </span>
                  </div>

                  {/* Foto Container */}
                  {mostrarFoto && selectedMember.foto_url ? (
                    <div 
                      className="w-24 h-28 bg-slate-800 rounded-lg overflow-hidden border-2"
                      style={{ borderColor: corAccent }}
                    >
                      <img src={selectedMember.foto_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div 
                      className="w-24 h-28 bg-slate-900 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-[10px] text-slate-500 font-bold"
                    >
                      SEM FOTO
                    </div>
                  )}

                  {/* Info Membro */}
                  <div className="text-center w-full">
                    <span 
                      className="text-sm font-black uppercase block tracking-wide truncate px-2"
                      style={{ color: corAccent }}
                    >
                      {selectedMember.nome}
                    </span>

                    {mostrarCargo && (
                      <span className="text-[10px] font-bold block uppercase tracking-wider mt-0.5">
                        {selectedMember.cargo || "MEMBRO"}
                      </span>
                    )}

                    {mostrarMatricula && (
                      <span className="text-[8px] font-bold text-slate-400 block tracking-widest mt-0.5">
                        MATRÍCULA: {selectedMember.matricula}
                      </span>
                    )}
                  </div>

                  {/* Rodapé Evento */}
                  <div className="text-center w-full border-t border-white/5 pt-2">
                    <span className="text-[7px] font-bold text-slate-400 block uppercase">
                      {localEvento} — {dataEvento}
                    </span>
                  </div>

                  {/* Faixa inferior */}
                  <div 
                    className="absolute bottom-0 inset-x-0 h-2.5" 
                    style={{ backgroundColor: corAccent }}
                  />
                </div>

                <button onClick={handleDownloadPDF} className="btn-primary w-full max-w-[260px] justify-center mt-4">
                  <Download size={16} />
                  Baixar Credencial PDF
                </button>
              </>
            ) : (
              <div className="w-[260px] h-[368px] glass-card flex items-center justify-center text-slate-500 font-bold text-sm">
                NENHUM SELECIONADO
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
