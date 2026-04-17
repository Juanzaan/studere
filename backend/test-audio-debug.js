// Script para debugear transcripción de audio
// Ejecutar: node test-audio-debug.js <ruta-al-audio.mp3>

const fs = require('fs');
const path = require('path');

const audioPath = process.argv[2];

if (!audioPath) {
  console.log('❌ Uso: node test-audio-debug.js <ruta-al-audio>');
  process.exit(1);
}

if (!fs.existsSync(audioPath)) {
  console.log('❌ Archivo no encontrado:', audioPath);
  process.exit(1);
}

const stats = fs.statSync(audioPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('=== DEBUG AUDIO ===');
console.log('Archivo:', path.basename(audioPath));
console.log('Tamaño:', sizeMB, 'MB');
console.log('Máximo permitido: 25 MB');

if (stats.size > 25 * 1024 * 1024) {
  console.log('⚠️  ADVERTENCIA: El archivo excede 25MB, será chunkeado');
}

// Leer el archivo y convertir a base64
const audioBuffer = fs.readFileSync(audioPath);
const base64 = audioBuffer.toString('base64');
const base64SizeMB = (base64.length / 1024 / 1024).toFixed(2);

console.log('Base64 size:', base64SizeMB, 'MB');
console.log('Primeros 100 chars:', base64.substring(0, 100));
console.log('\n✅ Listo para enviar al backend');
console.log('\nPara testear, ejecuta:');
console.log('curl.exe -X POST http://localhost:7071/api/transcribe-audio \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d "{\\"audioBase64\\":\\"' + base64.substring(0, 50) + '...\\",\\"fileName\\":\\"test.mp3\\"}"');
