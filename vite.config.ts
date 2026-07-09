import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' -> caminhos relativos. Faz o app funcionar no GitHub Pages
// em QUALQUER nome de repositório, sem precisar configurar /nome-do-repo/.
// (Combinado com HashRouter no roteamento.)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
