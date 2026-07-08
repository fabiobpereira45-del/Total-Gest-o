import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Inscricao {
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
  nome_mae?: string;
  naturalidade?: string;
  rg?: string;
  data_batismo?: string;
  foto_url?: string;
}

export function generatePDF(inscricoes: Inscricao[], tenantName: string, filtros?: {
  nome?: string;
  cpf?: string;
  igreja?: string;
  pastor?: string;
  cargo?: string;
  funcao?: string;
}, colunasVisiveis?: {
  matricula?: boolean;
  nome?: boolean;
  cpf?: boolean;
  idade?: boolean;
  telefone?: boolean;
  cargoFuncao?: boolean;
  estadoCivil?: boolean;
  endereco?: boolean;
  igrejaPastor?: boolean;
}) {
  const doc = new jsPDF('landscape');
  
  // Cabeçalho
  doc.setFontSize(20);
  doc.text(tenantName.toUpperCase(), 148, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('RELATÓRIO - CADASTRO DE MEMBROS E OBREIROS', 148, 32, { align: 'center' });
  
  // Informações dos filtros aplicados
  if (filtros) {
    let filtrosTexto = 'FILTROS: ';
    if (filtros.nome) filtrosTexto += `NOME: ${filtros.nome} | `;
    if (filtros.cpf) filtrosTexto += `CPF: ${filtros.cpf} | `;
    if (filtros.igreja) filtrosTexto += `IGREJA: ${filtros.igreja} | `;
    if (filtros.pastor) filtrosTexto += `PASTOR: ${filtros.pastor} | `;
    if (filtros.cargo) filtrosTexto += `CARGO: ${filtros.cargo} | `;
    if (filtros.funcao) filtrosTexto += `FUNÇÃO: ${filtros.funcao} | `;
    
    if (filtrosTexto !== 'FILTROS: ') {
      doc.setFontSize(10);
      doc.text(filtrosTexto.slice(0, -3).toUpperCase(), 148, 42, { align: 'center' });
    }
  }
  
  // Data de geração
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(10);
  doc.text(`GERADO EM: ${dataGeracao}`, 148, 50, { align: 'center' });
  
  // Tabela
  const todasColunas = [
    { label: 'MATRÍCULA', key: 'matricula' },
    { label: 'NOME', key: 'nome' },
    { label: 'CPF', key: 'cpf' },
    { label: 'IDADE', key: 'idade' },
    { label: 'TEL.', key: 'telefone' },
    { label: 'CARGO/FUNÇÃO', key: 'cargoFuncao' },
    { label: 'EST. CIVIL', key: 'estadoCivil' },
    { label: 'ENDEREÇO', key: 'endereco' },
    { label: 'IGREJA/PASTOR', key: 'igrejaPastor' },
  ];

  const headers = [
    todasColunas
      .filter(c => colunasVisiveis?.[c.key as keyof typeof colunasVisiveis] !== false)
      .map(c => c.label)
  ];
  
  const data = inscricoes.map((inscricao) => {
    const hoje = new Date();
    let idadeStr = '-';
    if (inscricao.data_nascimento) {
      const nascimento = new Date(inscricao.data_nascimento);
      if (!isNaN(nascimento.getTime())) {
        let idadeNum = hoje.getFullYear() - nascimento.getFullYear();
        const mesDiff = hoje.getMonth() - nascimento.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
          idadeNum--;
        }
        idadeStr = `${nascimento.toLocaleDateString('pt-BR')} (${idadeNum} ANOS)`;
      }
    }
    
    const enderecoFormatado = inscricao.cidade ? `${inscricao.cidade}/${inscricao.estado}`.toUpperCase() : '';
    let nomeFormatado = inscricao.nome ? inscricao.nome.toUpperCase() : '';
    let igrejaFormatada = inscricao.igreja ? inscricao.igreja.toUpperCase() : '';
    let pastorFormatado = inscricao.pastor ? inscricao.pastor.toUpperCase() : '';
    let cargoFormatado = inscricao.cargo ? inscricao.cargo.toUpperCase() : '';
    let funcaoFormatada = inscricao.funcao ? inscricao.funcao.toUpperCase() : '';
    
    const cargoFuncaoTexto = [cargoFormatado, funcaoFormatada].filter(Boolean).join(' - ') || '-';
    let consagracao = '';
    if (inscricao.data_consagracao) {
      const dataCons = new Date(inscricao.data_consagracao);
      if (!isNaN(dataCons.getTime())) {
        consagracao = `\nCONSAGRADO EM: ${dataCons.toLocaleDateString('pt-BR')}`;
      }
    }
    const cargoEFuncaoEConsagracao = cargoFuncaoTexto + consagracao;
    const igrejaPastor = [igrejaFormatada, pastorFormatado].filter(Boolean).join('\n');
    
    const rowData = {
      matricula: inscricao.matricula || '-',
      nome: nomeFormatado,
      cpf: inscricao.cpf,
      idade: idadeStr,
      telefone: inscricao.telefone,
      cargoFuncao: cargoEFuncaoEConsagracao,
      estadoCivil: inscricao.estado_civil ? inscricao.estado_civil.toUpperCase() : '-',
      endereco: enderecoFormatado,
      igrejaPastor: igrejaPastor,
    };

    return todasColunas
      .filter(c => colunasVisiveis?.[c.key as keyof typeof colunasVisiveis] !== false)
      .map(c => rowData[c.key as keyof typeof rowData]);
  });
  
  autoTable(doc, {
    head: headers,
    body: data,
    startY: 60,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { top: 60 },
  });
  
  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      148,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`cadastro-membros-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export async function generateIndividualPDF(inscricao: Inscricao, tenantName: string) {
  const doc = new jsPDF('portrait');
  
  // Cabeçalho
  doc.setFontSize(20);
  doc.text(tenantName.toUpperCase(), 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('FICHA INDIVIDUAL DE MEMBRO/OBREIRO', 105, 32, { align: 'center' });

  // Moldura e foto 3x4 no canto superior direito
  const photoX = 155;
  const photoY = 12;
  const photoW = 35;
  const photoH = 42;

  if (inscricao.foto_url) {
    try {
      const img = await loadImage(inscricao.foto_url);
      doc.addImage(img, 'JPEG', photoX, photoY, photoW, photoH);
      doc.setDrawColor(200, 200, 200);
      doc.rect(photoX, photoY, photoW, photoH);
    } catch (err) {
      console.warn("Falha ao carregar foto para o PDF:", err);
      doc.setDrawColor(220, 220, 220);
      doc.rect(photoX, photoY, photoW, photoH);
      doc.setFontSize(8);
      doc.text('SEM FOTO', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
    }
  } else {
    doc.setDrawColor(220, 220, 220);
    doc.rect(photoX, photoY, photoW, photoH);
    doc.setFontSize(8);
    doc.text('SEM FOTO', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
  }

  doc.setFontSize(11);
  let y = 60;
  const lineSpacing = 8;

  const addSection = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 20, y);
    y += lineSpacing;
    doc.line(20, y - 2, 190, y - 2);
    y += lineSpacing;
  };

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label.toUpperCase()}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '-').toUpperCase(), 70, y);
    y += lineSpacing;
  };

  // Matrícula se houver
  if (inscricao.matricula) {
    addField('Matrícula', inscricao.matricula);
  }

  // Informações Pessoais
  addSection('Informações Pessoais');
  addField('Nome', inscricao.nome);
  addField('Pai', inscricao.nome_pai || '-');
  addField('Mãe', inscricao.nome_mae || '-');
  addField('CPF', inscricao.cpf);
  addField('RG', inscricao.rg || '-');
  
  const hoje = new Date();
  let idadeInfo = '-';
  if (inscricao.data_nascimento) {
    const nascimento = new Date(inscricao.data_nascimento);
    if (!isNaN(nascimento.getTime())) {
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const m = hoje.getMonth() - nascimento.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
      idadeInfo = `${nascimento.toLocaleDateString('pt-BR')} (${idade} ANOS)`;
    }
  }

  addField('Data de Nascimento', idadeInfo);
  addField('Naturalidade', inscricao.naturalidade || '-');
  addField('Estado Civil', inscricao.estado_civil || '-');
  addField('Telefone', inscricao.telefone);

  y += 3;

  // Igreja e Ministério
  addSection('Igreja e Ministério');
  addField('Igreja', inscricao.igreja || '-');
  addField('Pastor', inscricao.pastor || '-');
  addField('Cargo', inscricao.cargo || '-');
  addField('Função', inscricao.funcao || '-');
  
  if (inscricao.data_batismo) {
    const dataBat = new Date(inscricao.data_batismo);
    addField('Data de Batismo', !isNaN(dataBat.getTime()) ? dataBat.toLocaleDateString('pt-BR') : '-');
  } else {
    addField('Data de Batismo', '-');
  }

  if (inscricao.data_consagracao) {
    const dataCons = new Date(inscricao.data_consagracao);
    addField('Data Consagração', !isNaN(dataCons.getTime()) ? dataCons.toLocaleDateString('pt-BR') : '-');
  }

  y += 3;

  // Endereço
  addSection('Endereço');
  addField('Rua', inscricao.rua || '-');
  addField('Número', inscricao.numero || '-');
  addField('Bairro', inscricao.bairro || '-');
  addField('Cidade/UF', `${inscricao.cidade || ''}/${inscricao.estado || ''}`);
  addField('CEP', inscricao.cep || '');

  const safeName = inscricao.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`ficha-${safeName}.pdf`);
}
