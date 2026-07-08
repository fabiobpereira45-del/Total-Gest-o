"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { getTenantFromStorage, TenantData } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Search, IdCard, Settings, Download } from "lucide-react";
import jsPDF from "jspdf";
import { QRCodeSVG } from "qrcode.react";

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

export default function CarteiraPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Opções customizáveis
  const [corFundoFrente, setCorFundoFrente] = useState("#0f172a");
  const [corFundoVerso, setCorFundoVerso] = useState("#1e293b");
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [corAccent, setCorAccent] = useState("#38bdf8");
  const [mostrarFoto, setMostrarFoto] = useState(true);
  const [mostrarMatricula, setMostrarMatricula] = useState(true);
  const [mostrarCargo, setMostrarCargo] = useState(true);
  const [validadeMeses, setValidadeMeses] = useState(24);
  const [textoVerso, setTextoVerso] = useState("ESTE DOCUMENTO COMPROVA QUE O PORTADOR É MEMBRO REGULAR DE NOSSA ORGANIZAÇÃO.");

  const fetchAllMembers = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      const { data: batismos } = await supabase
        .from("inscricoes_batismo")
        .select("id, nome, cpf, matricula, foto_url, cargo, funcao")
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

  const handleDownloadPDF = async () => {
    if (!selectedMember || !tenant) return;

    // Tamanho padrão de cartão de crédito CR-80 (85.6 x 53.98 mm)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 54]
    });

    // FRENTE (Página 1)
    doc.setFillColor(corFundoFrente);
    doc.rect(0, 0, 85.6, 54, "F");

    // Decoração borda accent
    doc.setFillColor(corAccent);
    doc.rect(0, 0, 2, 54, "F");

    // Nome da Organização
    doc.setTextColor(corTexto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(tenant.nome.toUpperCase(), 4, 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("CARTEIRA DE MEMBRO", 4, 11);

    // Foto do Membro
    let startXInfo = 23;
    if (mostrarFoto && selectedMember.foto_url) {
      try {
        const proxyImg = new Image();
        proxyImg.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
          proxyImg.onload = resolve;
          proxyImg.onerror = reject;
          proxyImg.src = selectedMember.foto_url!;
        });
        doc.addImage(proxyImg, "JPEG", 4, 15, 16, 20);
        doc.setDrawColor(corAccent);
        doc.setLineWidth(0.3);
        doc.rect(4, 15, 16, 20);
      } catch {
        doc.setDrawColor(corAccent);
        doc.rect(4, 15, 16, 20);
        doc.setFontSize(4);
        doc.text("SEM FOTO", 12, 25, { align: "center" });
      }
    } else {
      startXInfo = 4;
    }

    // Informações da Frente
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corAccent);
    doc.text(selectedMember.nome.toUpperCase(), startXInfo, 20);

    doc.setTextColor(corTexto);
    if (mostrarCargo) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text(`CARGO: ${String(selectedMember.cargo || "MEMBRO").toUpperCase()}`, startXInfo, 25);
    }

    if (mostrarMatricula) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`MATRÍCULA: ${selectedMember.matricula}`, startXInfo, 29);
    }

    // Data de Validade
    const dataVal = new Date();
    dataVal.setMonth(dataVal.getMonth() + validadeMeses);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(`VALIDADE: ${dataVal.toLocaleDateString("pt-BR")}`, startXInfo, 33);


    // VERSO (Página 2)
    doc.addPage([85.6, 54], "landscape");
    doc.setFillColor(corFundoVerso);
    doc.rect(0, 0, 85.6, 54, "F");

    // Decoração borda accent verso
    doc.setFillColor(corAccent);
    doc.rect(83.6, 0, 2, 54, "F");

    // Título Verso
    doc.setTextColor(corTexto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(tenant.nome.toUpperCase(), 4, 8);

    // Texto de Declaração
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    const lines = doc.splitTextToSize(textoVerso.toUpperCase(), 55);
    doc.text(lines, 4, 14);

    // Contatos / Endereço
    doc.setFontSize(4.5);
    doc.text(`END: ${tenant.endereco || "NÃO CADASTRADO"}`.toUpperCase(), 4, 40);
    doc.text(`TEL: ${tenant.telefone || "NÃO CADASTRADO"}`, 4, 44);

    // QR Code mockup
    // Desenha uma borda branca de QR Code
    doc.setFillColor("#ffffff");
    doc.rect(63, 12, 16, 16, "F");
    doc.setDrawColor(corAccent);
    doc.rect(63, 12, 16, 16);
    doc.setFontSize(3.5);
    doc.setTextColor("#000000");
    doc.text("QR VERIFY", 71, 27, { align: "center" });

    // Salvar
    const safeName = selectedMember.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`carteira-${safeName}.pdf`);
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
            4. Carteira de Membro
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gere carteiras de identificação frente e verso em tamanho padrão de cartão (CR-80).
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
                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                      selectedMember?.id === m.id ? "bg-indigo-600/20" : "hover:bg-white/2"
                    }`}
                  >
                    {m.foto_url ? (
                      <div className="w-8 h-10 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                        <img src={m.foto_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-10 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-slate-500 text-[8px] font-bold">
                        FOTO
                      </div>
                    )}
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

          {/* Customização (Meio) */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
              Configurações do Cartão
            </h3>

            <div className="glass-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Fundo Frente</label>
                  <input
                    type="color"
                    value={corFundoFrente}
                    onChange={(e) => setCorFundoFrente(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Fundo Verso</label>
                  <input
                    type="color"
                    value={corFundoVerso}
                    onChange={(e) => setCorFundoVerso(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Cor Texto</label>
                  <input
                    type="color"
                    value={corTexto}
                    onChange={(e) => setCorTexto(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label text-[10px]">Cor Destaque</label>
                  <input
                    type="color"
                    value={corAccent}
                    onChange={(e) => setCorAccent(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label">Validade (Meses)</label>
                <select
                  value={validadeMeses}
                  onChange={(e) => setValidadeMeses(Number(e.target.value))}
                  className="form-select"
                >
                  <option value={12}>12 MESES</option>
                  <option value={24}>24 MESES</option>
                  <option value={36}>36 MESES</option>
                  <option value={48}>48 MESES</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label">Texto do Verso</label>
                <textarea
                  value={textoVerso}
                  onChange={(e) => setTextoVerso(e.target.value)}
                  rows={3}
                  className="form-input text-xs font-semibold uppercase"
                />
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
                  <span>Mostrar Foto</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarMatricula}
                    onChange={(e) => setMostrarMatricula(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/10"
                  />
                  <span>Mostrar Matrícula</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarCargo}
                    onChange={(e) => setMostrarCargo(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-white/10"
                  />
                  <span>Mostrar Cargo</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview & Download (Direita) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col items-center">
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase self-start">Visualização da Carteira</h3>
            
            {selectedMember ? (
              <div className="space-y-6 w-full flex flex-col items-center">
                {/* FRENTE PREVIEW */}
                <div 
                  className="w-[300px] h-[190px] rounded-xl shadow-2xl relative overflow-hidden flex p-4 border border-white/10 select-none"
                  style={{ backgroundColor: corFundoFrente, color: corTexto }}
                >
                  {/* Borda Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: corAccent }} />
                  
                  {/* Foto */}
                  {mostrarFoto && selectedMember.foto_url ? (
                    <div 
                      className="w-20 h-24 bg-slate-800 rounded border flex-shrink-0 self-center"
                      style={{ borderColor: corAccent }}
                    >
                      <img src={selectedMember.foto_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div 
                      className="w-20 h-24 bg-slate-900 border border-dashed border-white/10 rounded flex items-center justify-center text-[8px] text-slate-500 font-bold flex-shrink-0 self-center"
                    >
                      SEM FOTO
                    </div>
                  )}

                  {/* Informações */}
                  <div className="flex-1 pl-4 flex flex-col justify-between py-1">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider block leading-tight truncate max-w-[170px]">
                        {tenant.nome}
                      </span>
                      <span className="text-[6px] font-bold text-slate-400 tracking-widest block">
                        CARTEIRA DE IDENTIFICAÇÃO DE MEMBRO
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase block tracking-wide truncate max-w-[170px]" style={{ color: corAccent }}>
                        {selectedMember.nome}
                      </span>
                      {mostrarCargo && (
                        <span className="text-[8px] font-bold block uppercase">
                          CARGO: {selectedMember.cargo || "MEMBRO"}
                        </span>
                      )}
                      {mostrarMatricula && (
                        <span className="text-[8px] font-bold text-slate-300 block">
                          MATRÍCULA: {selectedMember.matricula}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">
                        VALIDADE: {(() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + validadeMeses);
                          return date.toLocaleDateString("pt-BR");
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VERSO PREVIEW */}
                <div 
                  className="w-[300px] h-[190px] rounded-xl shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 border border-white/10 select-none"
                  style={{ backgroundColor: corFundoVerso, color: corTexto }}
                >
                  {/* Borda Accent */}
                  <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: corAccent }} />

                  <div>
                    <span className="text-[8px] font-black uppercase block truncate max-w-[260px]">
                      {tenant.nome}
                    </span>
                    <span className="text-[6px] text-slate-300 uppercase block font-medium mt-2 leading-relaxed">
                      {textoVerso}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="text-[5.5px] text-slate-400 font-semibold space-y-0.5">
                      <p>END: {tenant.endereco || "NÃO CADASTRADO"}</p>
                      <p>TEL: {tenant.telefone || "NÃO CADASTRADO"}</p>
                    </div>

                    <div className="bg-white p-1 rounded">
                      <QRCodeSVG value={`verify:${selectedMember.id}`} size={32} />
                    </div>
                  </div>
                </div>

                <button onClick={handleDownloadPDF} className="btn-primary w-full max-w-[300px] justify-center mt-4">
                  <Download size={16} />
                  Baixar Carteira PDF
                </button>
              </div>
            ) : (
              <div className="w-[300px] h-[190px] glass-card flex items-center justify-center text-slate-500 font-bold text-sm">
                NENHUM SELECIONADO
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
