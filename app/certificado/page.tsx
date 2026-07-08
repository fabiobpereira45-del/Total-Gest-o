"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Search, Award, Settings, Download, Layout } from "lucide-react";
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
  data_batismo?: string;
}

type ModelType = "CLASSICO" | "MODERNO" | "ECLESIAL";

export default function CertificadoPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Opções customizáveis do Certificado
  const [modelo, setModelo] = useState<ModelType>("CLASSICO");
  const [titulo, setTitulo] = useState("CERTIFICADO DE BATISMO");
  const [textoPrincipal, setTextoPrincipal] = useState(
    "CERTIFICAMOS QUE O(A) IRMÃO(Ã) {nome}, REGULARMENTE REGISTRADO(A) SOB A MATRÍCULA {matricula}, PASSOU PELAS ÁGUAS DO BATISMO CONFORME O MANDAMENTO BÍBLICO."
  );
  const [dataCertificado, setDataCertificado] = useState("07 DE JULHO DE 2026");
  const [assinatura1Nome, setAssinatura1Nome] = useState("PR. CARLOS SILVA");
  const [assinatura1Cargo, setAssinatura1Cargo] = useState("PRESIDENTE");
  const [assinatura2Nome, setAssinatura2Nome] = useState("SECRETÁRIO GERAL");
  const [assinatura2Cargo, setAssinatura2Cargo] = useState("SECRETARIA");

  const fetchAllMembers = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      const { data: batismos } = await supabase
        .from("inscricoes_batismo")
        .select("id, nome, cpf, matricula, foto_url, cargo, funcao, data_batismo")
        .eq("tenant_id", tenantId);

      const { data: gerais } = await supabase
        .from("membros_gerais")
        .select("id, nome, cpf, matricula, foto_url")
        .eq("tenant_id", tenantId);

      const merged: MemberRecord[] = [
        ...(batismos || []).map(b => ({ ...b, origem: "BATISMO" as const })),
        ...(gerais || []).map(g => ({ ...g, origem: "GERAL" as const, cargo: "MEMBRO", funcao: "GERAL" }))
      ];

      merged.sort((a, b) => a.nome.localeCompare(b.nome));
      setMembers(merged);
      
      if (merged.length > 0) {
        setSelectedMember(merged[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (activeTenant) {
      setTenant(activeTenant);
      fetchAllMembers(activeTenant.id);
    }
  }, []);

  const getInterpolatedText = () => {
    if (!selectedMember) return "";
    return textoPrincipal
      .replace("{nome}", selectedMember.nome.toUpperCase())
      .replace("{matricula}", selectedMember.matricula)
      .replace("{cargo}", String(selectedMember.cargo || "MEMBRO").toUpperCase())
      .replace("{data_batismo}", selectedMember.data_batismo ? new Date(selectedMember.data_batismo).toLocaleDateString("pt-BR") : "");
  };

  const handleDownloadPDF = () => {
    if (!selectedMember || !tenant) return;

    // A4 Paisagem (297 x 210 mm)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const textInterp = getInterpolatedText();

    if (modelo === "CLASSICO") {
      // 1. Moldura clássica (linhas duplas ornamentais)
      doc.setDrawColor(218, 165, 32); // Dourado
      doc.setLineWidth(1);
      doc.rect(6, 6, 285, 198);
      doc.setLineWidth(0.3);
      doc.rect(8, 8, 281, 194);

      // Cantoneiras decoradas básicas
      doc.setFillColor(218, 165, 32);
      doc.rect(6, 6, 6, 6);
      doc.rect(285, 6, 6, 6);
      doc.rect(6, 198, 6, 6);
      doc.rect(285, 198, 6, 6);

      // Nome da Organização
      doc.setTextColor(30, 27, 75); // Dark blue
      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.text(tenant.nome.toUpperCase(), 148, 28, { align: "center" });

      // Brasão decorativo (Círculo dourado)
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.8);
      doc.circle(148, 52, 10);
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text("TG", 148, 55, { align: "center" });

      // Título do Certificado
      doc.setFont("times", "bolditalic");
      doc.setFontSize(28);
      doc.setTextColor(218, 165, 32);
      doc.text(titulo.toUpperCase(), 148, 80, { align: "center" });

      // Texto Principal
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(textInterp, 230);
      doc.text(lines, 148, 102, { align: "center" });

      // Data
      doc.setFont("times", "italic");
      doc.setFontSize(12);
      doc.text(dataCertificado.toUpperCase(), 148, 145, { align: "center" });

      // Linhas de Assinatura
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(40, 172, 120, 172);
      doc.line(177, 172, 257, 172);

      // Assinatura 1
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 27, 75);
      doc.text(assinatura1Nome.toUpperCase(), 80, 178, { align: "center" });
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(assinatura1Cargo.toUpperCase(), 80, 182, { align: "center" });

      // Assinatura 2
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(assinatura2Nome.toUpperCase(), 217, 178, { align: "center" });
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(assinatura2Cargo.toUpperCase(), 217, 182, { align: "center" });

    } else if (modelo === "MODERNO") {
      // Background com gradiente lateral drawn
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 297, 210, "F");

      // Detalhes geométricos azulados
      doc.setFillColor(99, 102, 241); // Indigo
      doc.rect(0, 0, 12, 210, "F");
      doc.setFillColor(139, 92, 246); // Purple
      doc.rect(12, 0, 4, 210, "F");

      // Nome da Organização
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(tenant.nome.toUpperCase(), 154, 35, { align: "center" });

      // Divisor
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(1);
      doc.line(110, 45, 198, 45);

      // Título
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text(titulo.toUpperCase(), 154, 75, { align: "center" });

      // Texto Principal
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(textInterp, 210);
      doc.text(lines, 154, 100, { align: "center" });

      // Data
      doc.setFontSize(11);
      doc.text(dataCertificado.toUpperCase(), 154, 142, { align: "center" });

      // Linhas de Assinatura modernas
      doc.setDrawColor(226, 232, 240);
      doc.line(55, 172, 125, 172);
      doc.line(180, 172, 250, 172);

      // Assinatura 1
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(assinatura1Nome.toUpperCase(), 90, 178, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(assinatura1Cargo.toUpperCase(), 90, 182, { align: "center" });

      // Assinatura 2
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(assinatura2Nome.toUpperCase(), 215, 178, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(assinatura2Cargo.toUpperCase(), 215, 182, { align: "center" });

    } else {
      // MODELO ECLESIAL (Deep Blue and Gold borders)
      doc.setFillColor(30, 27, 75); // Dark Indigo background frame
      doc.rect(0, 0, 297, 210, "F");
      
      // Inside white frame
      doc.setFillColor(255, 255, 255);
      doc.rect(10, 10, 277, 190, "F");

      // Ornate inner frame
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.6);
      doc.rect(13, 13, 271, 184);

      // Cruz / Logo no topo
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(1.5);
      doc.line(148, 25, 148, 43); // cruz vertical
      doc.line(141, 31, 155, 31); // cruz horizontal

      // Nome da Organização
      doc.setTextColor(30, 27, 75);
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      doc.text(tenant.nome.toUpperCase(), 148, 56, { align: "center" });

      // Título
      doc.setFontSize(26);
      doc.setFont("times", "bold");
      doc.setTextColor(218, 165, 32);
      doc.text(titulo.toUpperCase(), 148, 80, { align: "center" });

      // Texto Principal
      doc.setFont("times", "normal");
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(textInterp, 220);
      doc.text(lines, 148, 102, { align: "center" });

      // Data
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(dataCertificado.toUpperCase(), 148, 145, { align: "center" });

      // Assinaturas
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.4);
      doc.line(50, 172, 120, 172);
      doc.line(177, 172, 247, 172);

      // Assinatura 1
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(assinatura1Nome.toUpperCase(), 85, 178, { align: "center" });
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.text(assinatura1Cargo.toUpperCase(), 85, 182, { align: "center" });

      // Assinatura 2
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(assinatura2Nome.toUpperCase(), 212, 178, { align: "center" });
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.text(assinatura2Cargo.toUpperCase(), 212, 182, { align: "center" });
    }

    const safeName = selectedMember.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`certificado-${safeName}.pdf`);
  };

  const filteredMembers = members.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase()) || 
    m.matricula.toLowerCase().includes(search.toLowerCase())
  );

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-mesh pl-0 sm:pl-[240px]">
      <Sidebar />

      <main className="p-6 sm:p-10 max-w-7xl mx-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
            5. Certificados
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gere certificados de honra, participação ou batismo com múltiplos modelos profissionais.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Seletor de Membros (Esquerda) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase">Selecionar Membro</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="PROCURAR..."
                className="form-input pl-10"
              />
            </div>

            <div className="glass-card max-h-[480px] overflow-y-auto divide-y divide-white/5">
              {loading ? (
                <div className="p-4 text-center text-slate-500">Carregando...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-500">Nenhum membro.</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                      selectedMember?.id === m.id ? "bg-indigo-600/20" : "hover:bg-white/2"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-white uppercase block truncate">{m.nome}</span>
                      <span className="text-xxs font-bold text-slate-500 tracking-wider">
                        {m.matricula}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Opções Customização (Meio) */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
              Opções do Certificado
            </h3>

            <div className="glass-card p-5 space-y-4">
              <div className="space-y-1">
                <label className="form-label">Modelo de Design</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["CLASSICO", "MODERNO", "ECLESIAL"] as ModelType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModelo(m)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        modelo === m 
                          ? "bg-indigo-600/20 text-white border-indigo-500" 
                          : "text-slate-400 border-white/5 hover:text-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label">Título do Certificado</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value.toUpperCase())}
                  className="form-input"
                />
              </div>

              <div className="space-y-1">
                <label className="form-label">Texto Principal</label>
                <textarea
                  value={textoPrincipal}
                  onChange={(e) => setTextoPrincipal(e.target.value.toUpperCase())}
                  rows={4}
                  placeholder="USE {nome}, {matricula}, {cargo} E {data_batismo} PARA DADOS DINÂMICOS."
                  className="form-input text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="form-label">Data de Emissão</label>
                <input
                  type="text"
                  value={dataCertificado}
                  onChange={(e) => setDataCertificado(e.target.value.toUpperCase())}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Assinatura 1 Nome</label>
                  <input
                    type="text"
                    value={assinatura1Nome}
                    onChange={(e) => setAssinatura1Nome(e.target.value.toUpperCase())}
                    className="form-input text-[10px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Assinatura 1 Cargo</label>
                  <input
                    type="text"
                    value={assinatura1Cargo}
                    onChange={(e) => setAssinatura1Cargo(e.target.value.toUpperCase())}
                    className="form-input text-[10px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Assinatura 2 Nome</label>
                  <input
                    type="text"
                    value={assinatura2Nome}
                    onChange={(e) => setAssinatura2Nome(e.target.value.toUpperCase())}
                    className="form-input text-[10px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Assinatura 2 Cargo</label>
                  <input
                    type="text"
                    value={assinatura2Cargo}
                    onChange={(e) => setAssinatura2Cargo(e.target.value.toUpperCase())}
                    className="form-input text-[10px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview (Direita) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase self-start">Visualização do Certificado</h3>
            
            {selectedMember ? (
              <div className="w-full flex flex-col items-center">
                {/* CERTIFICADO BOX (A4 Ratio landscape: 1.414) */}
                <div 
                  className="w-full aspect-[1.414] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 select-none border border-white/10"
                  style={{
                    backgroundColor: modelo === "CLASSICO" ? "#ffffff" : modelo === "MODERNO" ? "#f8fafc" : "#ffffff",
                    color: "#000000"
                  }}
                >
                  {/* DESIGN MODEL RENDERS */}
                  {modelo === "CLASSICO" && (
                    <>
                      {/* Double border golden */}
                      <div className="absolute inset-2.5 border-2 border-amber-600 pointer-events-none rounded" />
                      <div className="absolute inset-3.5 border border-amber-500 pointer-events-none rounded" />
                      
                      {/* Decorative corners */}
                      <div className="absolute top-2.5 left-2.5 w-2 h-2 bg-amber-600" />
                      <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-600" />
                      <div className="absolute bottom-2.5 left-2.5 w-2 h-2 bg-amber-600" />
                      <div className="absolute bottom-2.5 right-2.5 w-2 h-2 bg-amber-600" />

                      <div className="text-center font-serif flex-1 flex flex-col justify-between py-2">
                        <span className="text-[11px] font-black text-indigo-950 tracking-wider uppercase">{tenant.nome}</span>
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-bold text-amber-600 tracking-wide uppercase italic">{titulo}</span>
                          <div className="w-12 h-[1px] bg-amber-600 mt-1" />
                        </div>
                        <p className="text-[9px] text-slate-700 px-4 leading-relaxed font-semibold">
                          {getInterpolatedText()}
                        </p>
                        <span className="text-[8px] italic text-slate-500">{dataCertificado}</span>
                        
                        {/* Assinaturas */}
                        <div className="grid grid-cols-2 gap-8 px-6 mt-4">
                          <div className="border-t border-slate-300 pt-1 text-center">
                            <p className="text-[8px] font-bold text-indigo-950">{assinatura1Nome}</p>
                            <p className="text-[6.5px] text-slate-500">{assinatura1Cargo}</p>
                          </div>
                          <div className="border-t border-slate-300 pt-1 text-center">
                            <p className="text-[8px] font-bold text-indigo-950">{assinatura2Nome}</p>
                            <p className="text-[6.5px] text-slate-500">{assinatura2Cargo}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {modelo === "MODERNO" && (
                    <>
                      {/* Left border gradient stripe */}
                      <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-indigo-600" />
                      <div className="absolute left-3.5 top-0 bottom-0 w-1 bg-purple-500" />

                      <div className="text-center font-sans pl-6 flex-1 flex flex-col justify-between py-2">
                        <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">{tenant.nome}</span>
                        
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black text-indigo-600 tracking-tight uppercase">{titulo}</span>
                        </div>

                        <p className="text-[8.5px] text-slate-600 px-4 leading-relaxed font-medium">
                          {getInterpolatedText()}
                        </p>
                        
                        <span className="text-[8px] font-bold text-slate-500">{dataCertificado}</span>

                        {/* Assinaturas */}
                        <div className="grid grid-cols-2 gap-8 px-6 mt-4">
                          <div className="border-t border-slate-200 pt-1 text-center">
                            <p className="text-[7.5px] font-bold text-slate-800">{assinatura1Nome}</p>
                            <p className="text-[6.5px] text-slate-400">{assinatura1Cargo}</p>
                          </div>
                          <div className="border-t border-slate-200 pt-1 text-center">
                            <p className="text-[7.5px] font-bold text-slate-800">{assinatura2Nome}</p>
                            <p className="text-[6.5px] text-slate-400">{assinatura2Cargo}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {modelo === "ECLESIAL" && (
                    <>
                      {/* Deep Indigo Frame */}
                      <div className="absolute inset-0 border-[6px] border-indigo-950 pointer-events-none" />
                      <div className="absolute inset-2 border border-amber-500 pointer-events-none" />
                      
                      <div className="text-center font-serif flex-1 flex flex-col justify-between py-2 p-2">
                        <span className="text-[11px] font-bold text-indigo-950 uppercase">{tenant.nome}</span>
                        
                        <div className="flex flex-col items-center">
                          {/* Cross */}
                          <div className="flex flex-col items-center mb-1 text-amber-500">
                            <span className="text-sm font-black">+</span>
                          </div>
                          <span className="text-lg font-bold text-indigo-950 tracking-wide uppercase">{titulo}</span>
                        </div>

                        <p className="text-[9px] text-slate-800 px-6 leading-relaxed font-medium">
                          {getInterpolatedText()}
                        </p>
                        
                        <span className="text-[8px] font-semibold text-slate-500">{dataCertificado}</span>

                        {/* Assinaturas */}
                        <div className="grid grid-cols-2 gap-8 px-6 mt-4">
                          <div className="border-t border-amber-500/50 pt-1 text-center">
                            <p className="text-[7.5px] font-bold text-indigo-950">{assinatura1Nome}</p>
                            <p className="text-[6px] text-slate-500">{assinatura1Cargo}</p>
                          </div>
                          <div className="border-t border-amber-500/50 pt-1 text-center">
                            <p className="text-[7.5px] font-bold text-indigo-950">{assinatura2Nome}</p>
                            <p className="text-[6px] text-slate-500">{assinatura2Cargo}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button onClick={handleDownloadPDF} className="btn-primary w-full justify-center mt-6">
                  <Download size={16} />
                  Baixar Certificado PDF
                </button>
              </div>
            ) : (
              <div className="w-full aspect-[1.414] glass-card flex items-center justify-center text-slate-500 font-bold text-sm">
                NENHUM SELECIONADO
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
