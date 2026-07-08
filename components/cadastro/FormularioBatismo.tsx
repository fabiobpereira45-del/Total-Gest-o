"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CIDADES_BAHIA } from "@/lib/cidades-bahia";
import { 
  formatCPF, 
  formatTelefone, 
  formatCEP, 
  formatData, 
  parseDateBRToISO, 
  formatDateISOToBR, 
  validateCPF 
} from "@/lib/utils";
import { getTenantFromStorage, TenantData } from "@/lib/auth";

interface FormData {
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
  matricula?: string;
}

interface FormErrors {
  nome?: string;
  cpf?: string;
  data_nascimento?: string;
  data_consagracao?: string;
  telefone?: string;
  igreja?: string;
  pastor?: string;
  cargo?: string;
  funcao?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  estado_civil?: string;
  nome_pai?: string;
  nome_mae?: string;
  naturalidade?: string;
  rg?: string;
  data_batismo?: string;
  foto?: string;
}

const igrejasData = [
  { nome: "ADMTN - ARENOSO I", pastor: "PR. Nicodemos Glória" },
  { nome: "ADMTN - ARENOSO II", pastor: "PB. NATANAEL SANTANA" },
  { nome: "ADMTN - ARENOSO III", pastor: "BP. Marcelo da Paixão" },
  { nome: "ADMTN - CABULA VII", pastor: "Pb. Jeferson Guedes" },
  { nome: "ADMTN - CONJUNTO ACM", pastor: "PB. ISAC SOUZA" },
  { nome: "ADMTN - EDGARD SANTOS", pastor: "Pb. Marcos Almeida" },
  { nome: "ADMTN - FINAL DE LINHA", pastor: "Pb. Ezequeil Mendes" },
  { nome: "ADMTN - NOVA VILA", pastor: "Pb. Francisco Marinho" },
  { nome: "ADMTN - RÓTULA I", pastor: "Pr. Joval Barreto" },
  { nome: "ADMTN - RÓTULA II", pastor: "Pb. Robison Adorno" },
  { nome: "ADMTN - RÓTULA III", pastor: "PB. SANDIVAL PASSOS" },
  { nome: "ADMTN - RUA SÃO GERÔNIMO", pastor: "Pr. Samuel Miranda" },
  { nome: "ADMTN - TANCREDO NEVES II", pastor: "Pr. Domingos Prado" },
  { nome: "ADMTN - TANCREDO NEVES III", pastor: "PB. Claudio de Jesus Silva" },
  { nome: "ADMTN - TEMPLO CENTRAL", pastor: "Pr. Felipe Carvalho das Virgens" },
  { nome: "ADMTN - VILA DOIS IRMÃOS", pastor: "PB. JONATAS FERREIRA" },
  { nome: "ADMTN - VILA MOISÉS", pastor: "Pb. Augusto Spinola" }
];

const ESTADOS_BRASILEIROS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" }
];

const CAPITAIS: Record<string, string> = {
  AC: "Rio Branco", AL: "Maceió", AP: "Macapá", AM: "Manaus", BA: "Salvador",
  CE: "Fortaleza", DF: "Brasília", ES: "Vitória", GO: "Goiânia", MA: "São Luís",
  MT: "Cuiabá", MS: "Campo Grande", MG: "Belo Horizonte", PA: "Belém", PB: "João Pessoa",
  PR: "Curitiba", PE: "Recife", PI: "Teresina", RJ: "Rio de Janeiro", RN: "Natal",
  RS: "Porto Alegre", RO: "Porto Velho", RR: "Boa Vista", SC: "Florianópolis", SP: "São Paulo",
  SE: "Aracaju", TO: "Palmas"
};

export default function FormularioBatismo() {
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
    nome: "", cpf: "", data_nascimento: "", data_consagracao: "", telefone: "",
    igreja: "", pastor: "", cargo: "", funcao: "", cep: "", rua: "", numero: "",
    bairro: "", cidade: "", estado: "", estado_civil: "", nome_pai: "", nome_mae: "",
    naturalidade: "", rg: "", data_batismo: "", foto_url: "", matricula: ""
  });

  // Câmera/Foto
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fotoFile, setFotoFile] = useState<File | Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [estadoNaturalidade, setEstadoNaturalidade] = useState<string>("BA");
  const [cidades, setCidades] = useState<string[]>(CIDADES_BAHIA);
  const [carregandoCidades, setCarregandoCidades] = useState<boolean>(false);
  const [cidadesCache, setCidadesCache] = useState<Record<string, string[]>>({ BA: CIDADES_BAHIA });

  useEffect(() => {
    setTenant(getTenantFromStorage());
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const carregarCidadesDoEstado = async (uf: string, selecionarCapitalPadrao: boolean = false) => {
    if (!uf) {
      setCidades([]);
      return;
    }
    if (cidadesCache[uf]) {
      const listaCidades = cidadesCache[uf];
      setCidades(listaCidades);
      if (selecionarCapitalPadrao) {
        const capital = CAPITAIS[uf];
        if (capital && listaCidades.includes(capital)) {
          setFormData(prev => ({ ...prev, naturalidade: capital.toUpperCase() }));
        }
      }
      return;
    }
    setCarregandoCidades(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?ordenar=nome`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const listaCidades: string[] = data.map((item: any) => item.nome.toUpperCase());
      setCidadesCache(prev => ({ ...prev, [uf]: listaCidades }));
      setCidades(listaCidades);
      if (selecionarCapitalPadrao) {
        const capital = CAPITAIS[uf];
        if (capital && listaCidades.includes(capital.toUpperCase())) {
          setFormData(prev => ({ ...prev, naturalidade: capital.toUpperCase() }));
        }
      }
    } catch {
      setCidades([]);
    } finally {
      setCarregandoCidades(false);
    }
  };

  const handleEstadoNaturalidadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uf = e.target.value;
    setEstadoNaturalidade(uf);
    carregarCidadesDoEstado(uf, true);
  };

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
        setCameraError("Não foi possível acessar a câmera. Use a opção de carregar arquivo.");
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
            const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "igreja") {
      const selectedIgreja = igrejasData.find(i => i.nome === value);
      if (selectedIgreja) {
        setFormData(prev => ({ ...prev, igreja: value, pastor: selectedIgreja.pastor.toUpperCase() }));
        return;
      }
    }

    if (name === "cpf") {
      processedValue = formatCPF(value);
    } else if (name === "telefone") {
      processedValue = formatTelefone(value);
    } else if (name === "cep") {
      processedValue = formatCEP(value);
      const cepLimpo = processedValue.replace(/\D/g, "");
      if (cepLimpo.length === 8) buscarCep(cepLimpo);
    } else if (name === "data_nascimento" || name === "data_consagracao" || name === "data_batismo") {
      processedValue = formatData(value);
    } else {
      // REGRA: Todos os textos em MAIÚSCULAS
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const buscarCep = async (cepBuscado: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepBuscado}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          rua: (data.logradouro || "").toUpperCase(),
          bairro: (data.bairro || "").toUpperCase(),
          cidade: (data.localidade || "").toUpperCase(),
          estado: (data.uf || "").toUpperCase(),
        }));
      }
    } catch (error) {
      console.error(error);
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
    if (formData.cargo !== "MEMBRO") {
      if (!formData.data_consagracao || formData.data_consagracao.length !== 10) {
        newErrors.data_consagracao = "Data de consagração é obrigatória para este cargo";
      }
    }
    if (!formData.telefone || formData.telefone.replace(/\D/g, "").length < 10) {
      newErrors.telefone = "Telefone inválido";
    }
    if (!formData.igreja) newErrors.igreja = "Igreja é obrigatória";
    if (!formData.pastor) newErrors.pastor = "Pastor é obrigatório";
    if (!formData.cargo) newErrors.cargo = "Cargo é obrigatório";
    if (!formData.funcao) newErrors.funcao = "Função é obrigatória";
    if (!formData.estado_civil) newErrors.estado_civil = "Estado civil é obrigatório";
    if (!formData.cep || formData.cep.length !== 9) newErrors.cep = "CEP inválido";
    if (!formData.rua) newErrors.rua = "Rua é obrigatória";
    if (!formData.numero) newErrors.numero = "Número é obrigatório";
    if (!formData.bairro) newErrors.bairro = "Bairro é obrigatório";
    if (!formData.cidade) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado) newErrors.estado = "Estado inválido";
    if (!formData.nome_mae) newErrors.nome_mae = "Nome da mãe é obrigatório";
    if (!formData.naturalidade) newErrors.naturalidade = "Naturalidade é obrigatória";
    if (!formData.rg) newErrors.rg = "RG é obrigatório";
    if (!formData.data_batismo || formData.data_batismo.length !== 10) {
      newErrors.data_batismo = "Data de batismo é obrigatória";
    }
    if (!fotoPreview) {
      newErrors.foto = "Foto do membro é obrigatória";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      nome: "", cpf: "", data_nascimento: "", data_consagracao: "", telefone: "",
      igreja: "", pastor: "", cargo: "", funcao: "", cep: "", rua: "", numero: "",
      bairro: "", cidade: "", estado: "", estado_civil: "", nome_pai: "", nome_mae: "",
      naturalidade: "", rg: "", data_batismo: "", foto_url: "", matricula: ""
    });
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
        .from("inscricoes_batismo")
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
        data_nascimento: formatDateISOToBR(data.data_nascimento),
        data_consagracao: data.data_consagracao ? formatDateISOToBR(data.data_consagracao) : "",
        telefone: formatTelefone(data.telefone || ""),
        igreja: data.igreja || "",
        pastor: data.pastor || "",
        cargo: data.cargo || "",
        funcao: data.funcao || "",
        cep: formatCEP(data.cep || ""),
        rua: data.rua || "",
        numero: data.numero || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        estado: data.estado || "",
        estado_civil: data.estado_civil || "",
        nome_pai: data.nome_pai || "",
        nome_mae: data.nome_mae || "",
        naturalidade: data.naturalidade || "",
        rg: data.rg || "",
        data_batismo: data.data_batismo ? formatDateISOToBR(data.data_batismo) : "",
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
        const filePath = `batismos/${cpfLimpo}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-membros')
          .upload(filePath, fotoFile, { cacheControl: '3600', upsert: true });
          
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('fotos-membros').getPublicUrl(filePath);
        uploadedFotoUrl = publicUrl;
      }

      let currentMatricula = formData.matricula;

      if (modoEdicao) {
        const { error: supabaseError } = await supabase
          .from("inscricoes_batismo")
          .update({
            nome: formData.nome.trim().toUpperCase(),
            data_nascimento: parseDateBRToISO(formData.data_nascimento),
            data_consagracao: formData.data_consagracao ? parseDateBRToISO(formData.data_consagracao) : null,
            telefone: formData.telefone,
            igreja: formData.igreja.trim().toUpperCase(),
            pastor: formData.pastor.trim().toUpperCase(),
            cargo: formData.cargo,
            funcao: formData.funcao,
            cep: formData.cep.replace(/\D/g, ""),
            rua: formData.rua.trim().toUpperCase(),
            numero: formData.numero.trim().toUpperCase(),
            bairro: formData.bairro.trim().toUpperCase(),
            cidade: formData.cidade.trim().toUpperCase(),
            estado: formData.estado.trim().toUpperCase(),
            estado_civil: formData.estado_civil,
            nome_pai: formData.nome_pai?.trim().toUpperCase() || null,
            nome_mae: formData.nome_mae.trim().toUpperCase(),
            naturalidade: formData.naturalidade.trim().toUpperCase(),
            rg: formData.rg.trim().toUpperCase(),
            data_batismo: parseDateBRToISO(formData.data_batismo),
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
        currentMatricula = newMatricula;
        setMatriculaGerada(newMatricula);

        const { error: supabaseError } = await supabase
          .from("inscricoes_batismo")
          .insert([
            {
              tenant_id: tenant.id,
              matricula: newMatricula,
              nome: formData.nome.trim().toUpperCase(),
              cpf: formData.cpf.replace(/\D/g, ""),
              data_nascimento: parseDateBRToISO(formData.data_nascimento),
              data_consagracao: formData.data_consagracao ? parseDateBRToISO(formData.data_consagracao) : null,
              telefone: formData.telefone,
              igreja: formData.igreja.trim().toUpperCase(),
              pastor: formData.pastor.trim().toUpperCase(),
              cargo: formData.cargo,
              funcao: formData.funcao,
              cep: formData.cep.replace(/\D/g, ""),
              rua: formData.rua.trim().toUpperCase(),
              numero: formData.numero.trim().toUpperCase(),
              bairro: formData.bairro.trim().toUpperCase(),
              cidade: formData.cidade.trim().toUpperCase(),
              estado: formData.estado.trim().toUpperCase(),
              estado_civil: formData.estado_civil,
              nome_pai: formData.nome_pai?.trim().toUpperCase() || null,
              nome_mae: formData.nome_mae.trim().toUpperCase(),
              naturalidade: formData.naturalidade.trim().toUpperCase(),
              rg: formData.rg.trim().toUpperCase(),
              data_batismo: parseDateBRToISO(formData.data_batismo),
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
      setError(err.message || "Erro ao conectar com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2 uppercase">
          {submittedMode === "edicao" ? "Cadastro Atualizado!" : "Inscrição Realizada!"}
        </h2>
        <p className="text-slate-300 mb-4">
          {submittedMode === "edicao"
            ? "Os dados foram atualizados com sucesso."
            : "Inscrição gravada com sucesso na plataforma."}
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
              <h3 className="text-xl font-bold text-white uppercase">Buscar Inscrição</h3>
              <p className="text-sm text-slate-400 mt-1">
                Informe o CPF para consultar e atualizar a inscrição.
              </p>
            </div>

            {errorBusca && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
                {errorBusca}
              </div>
            )}

            <div className="space-y-2">
              <label className="form-label">CPF da Inscrição *</label>
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
              {loading ? "Buscando..." : "Buscar Inscrição"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {modoEdicao && (
              <div className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm">
                <span>Editando cadastro de: <strong>{formData.nome}</strong> {formData.matricula && `(${formData.matricula})`}</span>
                <button type="button" onClick={resetForm} className="text-xs font-bold text-indigo-300 hover:underline">
                  Cancelar
                </button>
              </div>
            )}

            {/* Foto */}
            <div className="space-y-3">
              <label className="form-label">Foto do Membro *</label>
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                <div className="relative w-36 h-44 bg-slate-800 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
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

            {/* Pessoais */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase border-b border-white/5 pb-2">Informações Pessoais</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="form-label">Nome Completo *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className={`form-input ${errors.nome ? "error" : ""}`} />
                  {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="form-label">Nome do Pai (Opcional)</label>
                    <input type="text" name="nome_pai" value={formData.nome_pai} onChange={handleChange} className="form-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="form-label">Nome da Mãe *</label>
                    <input type="text" name="nome_mae" value={formData.nome_mae} onChange={handleChange} required className="form-input" />
                    {errors.nome_mae && <p className="text-xs text-red-500">{errors.nome_mae}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="form-label">CPF *</label>
                    <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required disabled={modoEdicao} maxLength={14} className="form-input" />
                    {errors.cpf && <p className="text-xs text-red-500">{errors.cpf}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="form-label">RG *</label>
                    <input type="text" name="rg" value={formData.rg} onChange={handleChange} required className="form-input" />
                    {errors.rg && <p className="text-xs text-red-500">{errors.rg}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="form-label">Data de Nascimento *</label>
                    <input type="text" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} placeholder="DD/MM/AAAA" maxLength={10} required className="form-input" />
                    {errors.data_nascimento && <p className="text-xs text-red-500">{errors.data_nascimento}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="form-label">Naturalidade (Estado / Cidade) *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={estadoNaturalidade} onChange={handleEstadoNaturalidadeChange} className="form-select col-span-1">
                        {ESTADOS_BRASILEIROS.map((est) => (
                          <option key={est.sigla} value={est.sigla}>{est.sigla}</option>
                        ))}
                      </select>
                      <select name="naturalidade" value={formData.naturalidade} onChange={handleChange} required disabled={carregandoCidades} className="form-select col-span-2">
                        <option value="">Selecione...</option>
                        {(() => {
                          const capital = CAPITAIS[estadoNaturalidade];
                          const list = capital ? [capital.toUpperCase(), ...cidades.filter(c => c !== capital.toUpperCase())] : cidades;
                          return list.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Igreja */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase border-b border-white/5 pb-2">Igreja e Ministério</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label">Igreja *</label>
                  <select name="igreja" value={formData.igreja} onChange={handleChange} required className="form-select">
                    <option value="">Selecione...</option>
                    {igrejasData.map((i) => (
                      <option key={i.nome} value={i.nome}>{i.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="form-label">Seu Pastor *</label>
                  <input type="text" name="pastor" value={formData.pastor} onChange={handleChange} required className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label">Cargo *</label>
                  <select name="cargo" value={formData.cargo} onChange={handleChange} required className="form-select">
                    <option value="">Selecione...</option>
                    <option value="MEMBRO">MEMBRO</option>
                    <option value="AUXILIAR">AUXILIAR</option>
                    <option value="DIÁCONO">DIÁCONO</option>
                    <option value="PRESBÍTERO">PRESBÍTERO</option>
                    <option value="EVANGELISTA">EVANGELISTA</option>
                    <option value="PASTOR">PASTOR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="form-label">Função *</label>
                  <select name="funcao" value={formData.funcao} onChange={handleChange} required className="form-select">
                    <option value="">Selecione...</option>
                    <option value="SUPERINTENDENTE">SUPERINTENDENTE</option>
                    <option value="VICE">VICE</option>
                    <option value="PORTEIRO">PORTEIRO</option>
                    <option value="DIRG. CÍRCULO DE ORAÇÃO">DIRG. CÍRCULO DE ORAÇÃO</option>
                    <option value="OUTROS">OUTROS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label">Data de Batismo *</label>
                  <input type="text" name="data_batismo" value={formData.data_batismo} onChange={handleChange} placeholder="DD/MM/AAAA" maxLength={10} required className="form-input" />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Data de Consagração</label>
                  <input type="text" name="data_consagracao" value={formData.data_consagracao} onChange={handleChange} placeholder="DD/MM/AAAA" maxLength={10} disabled={formData.cargo === "MEMBRO"} className="form-input" />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase border-b border-white/5 pb-2">Contato e Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label">Telefone *</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" maxLength={15} required className="form-input" />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Estado Civil *</label>
                  <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} required className="form-select">
                    <option value="">Selecione...</option>
                    <option value="SOLTEIRO">SOLTEIRO(A)</option>
                    <option value="CASADO">CASADO(A)</option>
                    <option value="DIVORCIADO">DIVORCIADO(A)</option>
                    <option value="VIÚVO">VIÚVO(A)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="form-label">CEP *</label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleChange} placeholder="00000-000" maxLength={9} required className="form-input" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="form-label">Rua *</label>
                  <input type="text" name="rua" value={formData.rua} onChange={handleChange} required className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="form-label">Número *</label>
                  <input type="text" name="numero" value={formData.numero} onChange={handleChange} required className="form-input" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="form-label">Bairro *</label>
                  <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} required className="form-input" />
                </div>
                <div className="space-y-1">
                  <label className="form-label">UF *</label>
                  <input type="text" name="estado" value={formData.estado} onChange={handleChange} maxLength={2} required className="form-input" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label">Cidade *</label>
                <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} required className="form-input" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary justify-center h-12 text-base">
              {loading ? "Gravando dados..." : modoEdicao ? "Salvar Alterações" : "Gravar Inscrição"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
