const { createClient } = require("@supabase/supabase-js");

const OLD_SUPABASE_URL = "https://dwqfpoflkvfriyeqhdjw.supabase.co";
const OLD_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cWZwb2Zsa3Zmcml5ZXFoZGp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY3ODQyOSwiZXhwIjoyMDk0MjU0NDI5fQ.bhcavXrVXOxpqsAARLFhdn0cTGBoblUPnZ4KWtBgFl8";

async function main() {
  const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);
  
  console.log("Consultando inscricoes_batismo no banco antigo...");
  const res = await supabase.from("inscricoes_batismo").select("*");
  console.log("Erro:", res.error);
  console.log("Quantidade de registros:", res.data ? res.data.length : null);
  console.log("Dados:", res.data);
}

main();
