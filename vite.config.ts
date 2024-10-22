import { resolve } from 'path'
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname , 'src/index.ts'),
      name: 'raycasting',
      fileName: 'raycasting',
    }
  },
  plugins: [
    checker({
      typescript: true,
    }),
  ],
});
