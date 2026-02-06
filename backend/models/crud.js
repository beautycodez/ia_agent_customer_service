import supabase from "../lib/client.js" // o .ts según tu config

async function getCharacters() {
  const { data, error } = await supabase
    .from("users")
    .select()

  if (error) {
    console.error("Error:", error)
    return
  }

  console.log("Datos:", data)
}

getCharacters()
