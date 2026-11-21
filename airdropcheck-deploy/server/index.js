import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 AirdropCheck Lab (Simulasi Akademik)`);
  console.log(`  Server aktif di: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
