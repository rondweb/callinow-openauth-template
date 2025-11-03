#!/usr/bin/env node
/**
 * Script para gerar chaves de criptografia para OpenAuth
 */

const crypto = require('crypto');

console.log('🔐 Gerando chaves de criptografia para OpenAuth...\n');

// Gerar par de chaves RSA
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('✅ Chaves geradas com sucesso!\n');
console.log('📋 Adicione estas variáveis ao seu arquivo .dev.vars:\n');
console.log('# OpenAuth Encryption Keys');
console.log('PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
console.log('');
console.log('# Public key (optional, can be derived from private key)');
console.log('# PUBLIC_KEY="' + publicKey.replace(/\n/g, '\\n') + '"');
console.log('');
console.log('⚠️  IMPORTANTE: Guarde estas chaves em local seguro!');
console.log('    Em produção, use Cloudflare Secrets para armazená-las.');
