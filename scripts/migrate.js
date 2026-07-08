/**
 * SCRIPT DE MIGRAÇÃO DE DADOS — TOTAL GESTÃO
 * 
 * Cole as credenciais diretamente nas variáveis abaixo para rodar o script de forma segura.
 * 
 * Execução:
 * node scripts/migrate.js
 */

const { createClient } = require("@supabase/supabase-js");

// =========================================================================
// CONFIGURAÇÃO DOS BANCOS (Edite com suas credenciais)
// =========================================================================

const OLD_SUPABASE_URL = "https://dwqfpoflkvfriyeqhdjw.supabase.co";
const OLD_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cWZwb2Zsa3Zmcml5ZXFoZGp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY3ODQyOSwiZXhwIjoyMDk0MjU0NDI5fQ.bhcavXrVXOxpqsAARLFhdn0cTGBoblUPnZ4KWtBgFl8";

const NEW_SUPABASE_URL = "https://ubrwsdguffqrogxelvgh.supabase.co";
const NEW_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicndzZGd1ZmZxcm9neGVsdmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1NDIyMSwiZXhwIjoyMDk5MDMwMjIxfQ.9Ia5JkM5QJHdapjIbt2ntdiC2vJKFz2U6cPBjIvXbEs";
const TENANT_ID = "8e5a17a9-9d91-4f79-bea5-8b0b349f75e7"; // <--- UUID da tabela 'tenants'

// =========================================================================

async function main() {
  console.log("\n=== INICIANDO MIGRAÇÃO DE DADOS ===");

  if (!OLD_SUPABASE_URL || !OLD_SUPABASE_ANON_KEY || !NEW_SUPABASE_URL || !NEW_SUPABASE_ANON_KEY || !TENANT_ID) {
    console.error("\n[ERRO]: Todas as chaves e a URL do novo projeto precisam ser preenchidas no arquivo scripts/migrate.js!");
    console.log("Por favor, abra o arquivo 'scripts/migrate.js' e insira a 'NEW_SUPABASE_ANON_KEY'.\n");
    process.exit(1);
  }

  const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);
  const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_ANON_KEY);

  try {
    // 1. Verificar se o Tenant existe
    const { data: tenant, error: tenantError } = await newSupabase
      .from("tenants")
      .select("nome")
      .eq("id", TENANT_ID)
      .single();

    if (tenantError || !tenant) {
      console.error(`\n[ERRO]: Organização com UUID ${TENANT_ID} não encontrada no novo banco de dados.`);
      process.exit(1);
    }

    console.log(`Organização Destino: ${tenant.nome}`);

    // 2. Buscar registros do banco antigo
    console.log("Buscando registros do banco de dados antigo...");
    const { data: inscricoes, error: fetchError } = await oldSupabase
      .from("inscricoes_batismo")
      .select("*");

    if (fetchError) {
      throw new Error(`Erro ao buscar dados antigos: ${fetchError.message}`);
    }

    console.log(`Encontrados ${inscricoes.length} registros para migração.`);

    if (inscricoes.length === 0) {
      console.log("Nada a migrar.");
      process.exit(0);
    }

    // 3. Migrar registros gerando matrícula para cada um
    let migrados = 0;
    let erros = 0;

    for (let index = 0; index < inscricoes.length; index++) {
      const item = inscricoes[index];
      process.stdout.write(`Migrando [${index + 1}/${inscricoes.length}] ${item.nome}... `);

      try {
        // Gerar matrícula utilizando a RPC no novo banco
        const { data: matricula, error: rpcError } = await newSupabase.rpc("gerar_matricula", {
          p_tenant_id: TENANT_ID
        });

        if (rpcError) throw rpcError;

        // Inserir registro no novo banco de dados
        const { error: insertError } = await newSupabase
          .from("inscricoes_batismo")
          .insert([
            {
              tenant_id: TENANT_ID,
              matricula: matricula,
              nome: item.nome.toUpperCase(),
              cpf: item.cpf.replace(/\D/g, ""),
              data_nascimento: item.data_nascimento,
              data_consagracao: item.data_consagracao || null,
              telefone: item.telefone,
              igreja: (item.igreja || "").toUpperCase(),
              pastor: (item.pastor || "").toUpperCase(),
              cargo: (item.cargo || "MEMBRO").toUpperCase(),
              funcao: (item.funcao || "OUTROS").toUpperCase(),
              cep: item.cep || "",
              rua: (item.rua || "").toUpperCase(),
              numero: item.numero || "",
              bairro: (item.bairro || "").toUpperCase(),
              cidade: (item.cidade || "").toUpperCase(),
              estado: (item.estado || "").toUpperCase(),
              estado_civil: (item.estado_civil || "SOLTEIRO").toUpperCase(),
              nome_pai: item.nome_pai ? item.nome_pai.toUpperCase() : null,
              nome_mae: item.nome_mae ? item.nome_mae.toUpperCase() : "",
              naturalidade: item.naturalidade ? item.naturalidade.toUpperCase() : "",
              rg: item.rg || "",
              data_batismo: item.data_batismo || null,
              foto_url: item.foto_url || null,
            }
          ]);

        if (insertError) {
          if (insertError.message.includes("duplicate key")) {
            console.log("PULADO (CPF já cadastrado)");
          } else {
            throw insertError;
          }
        } else {
          console.log(`OK (Matrícula: ${matricula})`);
          migrados++;
        }
      } catch (err) {
        console.log(`ERRO: ${err.message}`);
        erros++;
      }
    }

    console.log(`\n=== RELATÓRIO FINAL ===`);
    console.log(`Migrados com sucesso: ${migrados}`);
    console.log(`Erros/Falhas: ${erros}`);
    console.log("Migração concluída com sucesso!\n");

  } catch (error) {
    console.error(`\nErro fatal no processo: ${error.message}`);
  }
}

main();
