import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// envDir: el .env vive en la raíz del monorepo y lo comparten tienda y sistema interno.
export default defineConfig({ plugins: [react()], envDir: '../../', server: { port: 5173 } });
