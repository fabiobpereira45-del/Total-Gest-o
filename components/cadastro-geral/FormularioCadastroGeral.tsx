"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  formatCPF, 
  formatData, 
  parseDateBRToISO, 
  validateCPF 
} from "@/lib/utils";
import { getTenantFromStorage, TenantData } from "@/lib/auth";

interface FormData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  foto_url?: string;
  matricula?: string;
}

interface FormErrors {
  nome?: string;
  cpf?: string;
  data_nascimento?: string;
  foto?: string;
}

export default function FormularioCadastroGeral() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [modoBusca, setModoBusca] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [cpfBusca, setCpfBusca] = useState("");
  const [errorBusca, setErrorBusca] = useState<string | null>(null);
  const [submittedMode, setSubmittedMode] = useState<"cadastro" | "edicao">("cadastro");
  const [matriculaGerada, setMatriculaGerada] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    nome: "", cpf: "", data_nascimento: "", foto_url: "", matricula: ""
  });

  // Câmera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fotoFile, setFotoFile] = useState<File | Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    setTenant(getTenantFromStorage());
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const ligarCamera = async (mode: 'user' | 'environment' = 'user') => {
    setCameraError(null);
    setCameraAtiva(true);
    setFacingMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError("Não foi possível acessar a câmera.");
        setCameraAtiva(false);
      }
    }
  };

  const alternarCamera = async () => {
    const novoModo = facingMode === 'user' ? 'environment' : 'user';
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    await ligarCamera(novoModo);
  };

  const desligarCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraAtiva(false);
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (facingMode === 'user') {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `foto-geral-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFotoFile(file);
            setFotoPreview(canvas.toDataURL('image/jpeg'));
          }
        }, 'image/jpeg', 0.95);
        desligarCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "cpf") {
      processedValue = formatCPF(value);
    } else if (name === "data_nascimento") {
      processedValue = formatData(value);
    } else {
      // REGRA: Letras maiúsculas
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const today = new Date();
    
    if (!formData.nome || formData.nome.trim().length < 3) {
      newErrors.nome = "Nome deve ter pelo menos 3 caracteres";
    }
    if (!formData.cpf) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    if (!formData.data_nascimento || formData.data_nascimento.length !== 10) {
      newErrors.data_nascimento = "Data de nascimento inválida";
    } else {
      const birthDate = new Date(parseDateBRToISO(formData.data_nascimento) + "T00:00:00");
      if (birthDate >= today) {
        newErrors.data_nascimento = "Data de nascimento deve ser no passado";
      }
    }
    if (!fotoPreview) {
      newErrors.foto = "Foto é obrigatória";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({ nome: "", cpf: "", data_nascimento: "", foto_url: "", matricula: "" });
    setFotoFile(null);
    setFotoPreview(null);
    setErrors({});
    setError(null);
    setEditId(null);
    setModoEdicao(false);
    setModoBusca(false);
    setCpfBusca("");
    setErrorBusca(null);
    setMatriculaGerada(null);
  };

  const handleBuscarCadastro = async () => {
    if (!tenant) return;
    setErrorBusca(null);
    const cpfLimpo = cpfBusca.replace(/\D/g, "");
    if (!cpfLimpo || !validateCPF(cpfBusca)) {
      setErrorBusca("CPF inválido.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("membros_gerais")
        .select("*")
        .eq("cpf", cpfLimpo)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setErrorBusca("CPF não cadastrado nesta organização.");
        return;
      }

      setFormData({
        nome: data.nome || "",
        cpf: formatCPF(data.cpf || ""),
        data_nascimento: new Date(data.data_nascimento).toLocaleDateString("pt-BR"),
        foto_url: data.foto_url || "",
        matricula: data.matricula || "",
      });

      if (data.foto_url) setFotoPreview(data.foto_url);
      setEditId(data.id);
      setModoEdicao(true);
      setModoBusca(false);
    } catch {
      setErrorBusca("Erro ao buscar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tenant) return;
    if (!validate()) return;
    
    setLoading(true);
    setSubmittedMode(modoEdicao ? "edicao" : "cadastro");
    
    try {
      let uploadedFotoUrl = formData.foto_url || "";
      if (fotoFile) {
        const cpfLimpo = formData.cpf.replace(/\D/g, "");
        const filePath = `membros/${cpfLimpo}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-membros')
          .upload(filePath, fotoFile, { cacheControl: '3600', upsert: true });
          
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('fotos-membros').getPublicUrl(filePath);
        uploadedFotoUrl = publicUrl;
      }

      if (modoEdicao) {
        const { error: supabaseError } = await supabase
          .from("membros_gerais")
          .update({
            nome: formData.nome.trim().toUpperCase(),
            data_nascimento: parseDateBRToISO(formData.data_nascimento),
            foto_url: uploadedFotoUrl || null,
          })
          .eq("id", editId);

        if (supabaseError) throw supabaseError;
      } else {
        // GERAÇÃO AUTOMÁTICA DE MATRÍCULA
        const { data: newMatricula, error: rpcError } = await supabase.rpc("gerar_matricula", {
          p_tenant_id: tenant.id
        });
        if (rpcError) throw rpcError;
        setMatriculaGerada(newMatricula);

        const { error: supabaseError } = await supabase
          .from("membros_gerais")
          .insert([
            {
              tenant_id: tenant.id,
              matricula: newMatricula,
              nome: formData.nome.trim().toUpperCase(),
              cpf: formData.cpf.replace(/\D/g, ""),
              data_nascimento: parseDateBRToISO(formData.data_nascimento),
              foto_url: uploadedFotoUrl || null,
            },
          ]);

        if (supabaseError) {
          if (supabaseError.message.includes("duplicate key")) {
            throw new Error("Este CPF já está cadastrado.");
          }
          throw supabaseError;
        }
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2 uppercase">
          {submittedMode === "edicao" ? "Cadastro Geral Atualizado!" : "Cadastro Geral Realizado!"}
        </h2>
        <p className="text-slate-300 mb-4">
          Os dados foram salvos com sucesso na plataforma.
        </p>
        
        {matriculaGerada && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 mb-6">
            <span className="text-xxs font-bold text-indigo-300 block uppercase tracking-wider">Número de Matrícula Gerado</span>
            <span className="text-3xl font-extrabold text-white tracking-widest">{matriculaGerada}</span>
          </div>
        )}

        <button onClick={() => { setSuccess(false); resetForm(); }} className="btn-primary">
          Novo Cadastro / Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {!modoEdicao && (
        <div className="flex border-b border-white/5 bg-white/1 p-1 gap-2">
          <button
            type="button"
            onClick={() => { setModoBusca(false); resetForm(); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all uppercase ${
              !modoBusca ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Novo Cadastro
          </button>
          <button
            type="button"
            onClick={() => { setModoBusca(true); setErrorBusca(null); setCpfBusca(""); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all uppercase ${
              modoBusca ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Editar Cadastro
          </button>
        </div>
      )}

      <div className="p-6 sm:p-8">
        {modoBusca ? (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white uppercase">Buscar Cadastro Geral</h3>
              <p className="text-sm text-slate-400 mt-1">
                Informe o CPF para consultar e atualizar a ficha.
              </p>
            </div>

            {errorBusca && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
                {errorBusca}
              </div>
            )}

            <div className="space-y-2">
              <label className="form-label">CPF *</label>
              <input
                type="text"
                value={cpfBusca}
                onChange={(e) => setCpfBusca(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="form-input text-center text-lg"
              />
            </div>

            <button onClick={handleBuscarCadastro} disabled={loading} className="w-full btn-primary justify-center h-12">
              {loading ? "Buscando..." : "Buscar Registro"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {modoEdicao && (
              <div className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm">
                <span>Editando: <strong>{formData.nome}</strong> {formData.matricula && `(${formData.matricula})`}</span>
                <button type="button" onClick={resetForm} className="text-xs font-bold text-indigo-300 hover:underline">
                  Cancelar
                </button>
              </div>
            )}

            {/* Foto */}
            <div className="space-y-3">
              <label className="form-label">Foto do Cadastro *</label>
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                <div className="relative w-32 h-40 bg-slate-800 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : cameraAtiva ? (
                    <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                  ) : (
                    <div className="text-center text-slate-500">
                      <span className="text-xxs uppercase font-bold">Sem Foto</span>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {cameraAtiva ? (
                      <>
                        <button type="button" onClick={capturarFoto} className="btn-primary py-2 text-xs">
                          Capturar
                        </button>
                        <button type="button" onClick={alternarCamera} className="btn-secondary py-2 text-xs">
                          Alternar Câmera
                        </button>
                        <button type="button" onClick={desligarCamera} className="btn-secondary py-2 text-xs text-red-400">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => ligarCamera('user')} className="btn-primary py-2 text-xs">
                          Usar Câmera
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary py-2 text-xs">
                          Galeria
                        </button>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  {errors.foto && <p className="text-xs text-red-500 font-semibold">{errors.foto}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">Nome Completo *</label>
              <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="form-input" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label">CPF *</label>
                <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required disabled={modoEdicao} maxLength={14} className="form-input" />
                {errors.cpf && <p className="text-xs text-red-500">{errors.cpf}</p>}
              </div>

              <div className="space-y-1">
                <label className="form-label">Data de Nascimento *</label>
                <input type="text" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} placeholder="DD/MM/AAAA" maxLength={10} required className="form-input" />
                {errors.data_nascimento && <p className="text-xs text-red-500">{errors.data_nascimento}</p>}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary justify-center h-12 text-base">
              {loading ? "Gravando dados..." : modoEdicao ? "Salvar Alterações" : "Finalizar Cadastro"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
