// Script para diagnosticar sesiones en localStorage
console.log('=== SESIONES EN LOCALSTORAGE ===\n');

const sessionsKey = 'studere_sessions_v3';
const sessionsRaw = localStorage.getItem(sessionsKey);

if (!sessionsRaw) {
  console.log('❌ No hay sesiones guardadas en localStorage');
} else {
  try {
    const sessions = JSON.parse(sessionsRaw);
    console.log(`✅ Total de sesiones: ${sessions.length}\n`);
    
    // Buscar la sesión de macroeconomia
    const targetSession = sessions.find(s => s.id.includes('macroeconomia-c2'));
    
    if (targetSession) {
      console.log('🔍 SESIÓN ENCONTRADA:');
      console.log('-------------------');
      console.log('ID:', targetSession.id);
      console.log('Título:', targetSession.title);
      console.log('Curso:', targetSession.course);
      console.log('Fecha:', new Date(targetSession.createdAt).toLocaleString());
      console.log('\n📝 TRANSCRIPCIÓN:');
      console.log('Longitud:', targetSession.transcript?.length || 0, 'caracteres');
      console.log('Primeros 200 chars:', targetSession.transcript?.substring(0, 200));
      console.log('\n📊 CONTENIDO GENERADO:');
      console.log('Summary:', targetSession.summary ? 'SÍ (' + targetSession.summary.length + ' chars)' : 'NO');
      console.log('Conceptos:', targetSession.keyConcepts?.length || 0);
      console.log('Flashcards:', targetSession.flashcards?.length || 0);
      console.log('Quiz:', targetSession.quiz?.length || 0);
      console.log('Action Items:', targetSession.actionItems?.length || 0);
      
      if (targetSession.keyConcepts && targetSession.keyConcepts.length > 0) {
        console.log('\n🔑 CONCEPTOS CLAVE:');
        targetSession.keyConcepts.slice(0, 3).forEach((c, i) => {
          console.log(`${i+1}. ${c.term}: ${c.definition?.substring(0, 100)}...`);
        });
      }
      
      if (targetSession.quiz && targetSession.quiz.length > 0) {
        console.log('\n❓ QUIZ:');
        targetSession.quiz.slice(0, 2).forEach((q, i) => {
          console.log(`${i+1}. ${q.question}`);
          if (q.options) {
            q.options.forEach((opt, j) => {
              console.log(`   ${String.fromCharCode(65+j)}. ${opt}`);
            });
            console.log(`   Correcta: ${String.fromCharCode(65+(q.correct || 0))}`);
          }
        });
      }
      
    } else {
      console.log('❌ No se encontró la sesión de macroeconomia-c2');
      console.log('\nSesiones disponibles:');
      sessions.forEach(s => {
        console.log(`- ${s.id}: ${s.title || 'Sin título'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al parsear sesiones:', error);
  }
}

console.log('\n=== FIN DEL DIAGNÓSTICO ===');
