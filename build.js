import esbuild from 'esbuild';

async function runBuild() {
  try {
    await esbuild.build({
      entryPoints: ['scripts/course-page/main.js'],
      bundle: true,
      minify: false,
      outfile: 'dist/course-page.bundle.js',
      format: 'iife',
      target: ['chrome111']
    });
    console.log('Build complete: dist/course-page.bundle.js');
  } catch (err) {
    console.error('Build error:', err);
    process.exitCode = 1;
  }
}

runBuild();