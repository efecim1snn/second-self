'use strict';

/**
 * TUM DATAYI SIL - komut satiri surumu.
 *
 *   node reset.js --confirm            -> karakter + galeri arsive tasinir (geri alinabilir)
 *   node reset.js --confirm --hard     -> kalici siler
 *   node reset.js --confirm --all      -> API anahtarlarini da siler
 *
 * Ayni islem panelden de yapilabilir (Ayarlar > TUM VERIYI SIL).
 */

const store = require('./src/store');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);

if (!has('--confirm')) {
  const character = store.getCharacter();
  console.log('');
  console.log('  TUM DATAYI SIL');
  console.log('  --------------');
  console.log(`  Mevcut karakter : ${character ? `${character.identity.name} (@${character.identity.handle})` : 'yok'}`);
  console.log(`  Galerideki gorsel: ${store.getGallery().length}`);
  console.log('');
  console.log('  Bu islem karakteri ve uretilen tum gorselleri kaldirir,');
  console.log('  sifirdan yeni bir karakter yaratmani saglar.');
  console.log('');
  console.log('  Onaylamak icin:');
  console.log('    node reset.js --confirm           (arsive tasi - geri alinabilir)');
  console.log('    node reset.js --confirm --hard    (kalici sil)');
  console.log('    node reset.js --confirm --all     (API anahtarlarini da sil)');
  console.log('');
  process.exit(1);
}

const result = store.resetAll({ hard: has('--hard'), keepProviders: !has('--all') });

console.log('');
if (result.hard) {
  console.log('  Tum veri kalici olarak silindi.');
} else {
  console.log(`  Tum veri arsive tasindi: ${result.archive}`);
}
console.log(`  Silinen dosyalar: ${result.moved.length ? result.moved.join(', ') : 'yoktu'}`);
console.log(has('--all')
  ? '  API anahtarlari da silindi.'
  : '  API anahtarlarin korundu (silmek icin --all ekle).');
console.log('');
console.log('  Simdi paneli ac, sihirbaz sifirdan baslayacak.');
console.log('');
