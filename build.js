const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['scripts/course-page/main.js'],
  bundle: true,
  minify: false,
  outfile: 'dist/course-page.bundle.js',
  format: 'iife',
  target: ['chrome111'],
}).then(() => {
  console.log('✅ Build completo!');
}).catch((err) => {
  console.error('❌ Erro no build:', err);
});
