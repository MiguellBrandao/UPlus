import esbuild from 'esbuild';
import open from 'open';

esbuild.build({
  entryPoints: ['scripts/course-page/main.js'],
  bundle: true,
  minify: false,
  outfile: 'dist/course-page.bundle.js',
  format: 'iife',
  target: ['chrome111'],
}).then(async () => {
  console.log('✅ Build completo!');
  await open('http://reload.extensions');~
  console.log('🔁 Extensão atualizada!');
}).catch((err) => {
  console.error('❌ Erro no build:', err);
});
