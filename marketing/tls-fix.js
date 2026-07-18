// Лечение macOS-проблемы: Node не читает Keychain, и если системный/корпоративный
// корневой сертификат лежит только там, любой fetch падает с
// UNABLE_TO_GET_ISSUER_CERT_LOCALLY. Экспортируем корни из Keychain в .ca.pem
// и перезапускаем текущий скрипт с NODE_EXTRA_CA_CERTS (Node читает её только
// на старте процесса, поэтому нужен именно перезапуск).

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const PEM = path.join(__dirname, '.ca.pem');
const CERT_ERRORS = new Set([
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_UNTRUSTED',
]);

async function ensureTls() {
  if (process.env.NODE_EXTRA_CA_CERTS) return; // уже перезапущены (или настроено вручную)
  try {
    await fetch('https://api.github.com/', { method: 'HEAD' });
    return; // сертификаты в порядке
  } catch (e) {
    const code = e.cause && e.cause.code;
    if (!CERT_ERRORS.has(code)) return; // не сертификатная проблема — пусть упадёт по месту
  }
  if (process.platform !== 'darwin') {
    throw new Error('TLS: сертификаты не проходят проверку; задайте NODE_EXTRA_CA_CERTS вручную');
  }
  console.log('Node не видит системные сертификаты — экспортирую из Keychain и перезапускаюсь…');
  let pem = '';
  for (const kc of [
    '/System/Library/Keychains/SystemRootCertificates.keychain',
    '/Library/Keychains/System.keychain',
  ]) {
    try { pem += execFileSync('security', ['find-certificate', '-a', '-p', kc], { encoding: 'utf8' }); } catch {}
  }
  if (!pem) throw new Error('не удалось экспортировать сертификаты из Keychain');
  fs.writeFileSync(PEM, pem);
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, NODE_EXTRA_CA_CERTS: PEM },
  });
  process.exit(r.status === null ? 1 : r.status);
}

module.exports = { ensureTls };
