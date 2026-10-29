import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type EncryptedValue = { ciphertext: string; nonce: string; tag: string };
type PromotionInput = { phoneNumber: string; templateId: string; language?: string; variables?: Record<string, string> };
type SendPromotionInput = { consentId: string; templateId: string; language?: string; variables?: Record<string, string>; authenticationCode?: string };

const PROVIDER = 'ARATTAI';
const PURPOSE_PROMOTIONAL = 'PROMOTIONAL';
const ARATTAI_API = 'https://business.arattai.in/api/v1';

@Injectable()
export class MessagingIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  private encryptionKey(): Buffer {
    const raw = process.env.KK_MESSAGING_ENCRYPTION_KEY || '';
    if (!/^[a-fA-F0-9]{64}$/.test(raw)) {
      throw new ServiceUnavailableException('Messaging integrations are not configured yet. Set KK_MESSAGING_ENCRYPTION_KEY to a protected 32-byte hex key in the backend environment.');
    }
    return Buffer.from(raw, 'hex');
  }

  private encrypt(value: string): EncryptedValue {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), nonce);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { ciphertext: ciphertext.toString('base64'), nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
  }

  private decrypt(value: { accessTokenCiphertext?: string; recipientCiphertext?: string; accessTokenNonce?: string; recipientNonce?: string; accessTokenTag?: string; recipientTag?: string }): string {
    const ciphertext = value.accessTokenCiphertext || value.recipientCiphertext;
    const nonce = value.accessTokenNonce || value.recipientNonce;
    const tag = value.accessTokenTag || value.recipientTag;
    if (!ciphertext || !nonce || !tag) throw new ServiceUnavailableException('Stored messaging credential is incomplete.');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(nonce, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  private normalizePhone(input: string): { digits: string; apiValue: string } {
    const digits = String(input || '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) throw new BadRequestException('Enter a valid phone number with country code.');
    return { digits, apiValue: digits.length === 12 && digits.startsWith('91') ? '91-' + digits.slice(2) : digits };
  }

  private async connected(userId: string) {
    const connection = await this.prisma.messagingProviderConnection.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } });
    if (!connection || connection.status !== 'CONNECTED') throw new NotFoundException('Connect your own Arattai Business account first.');
    return { connection, accessToken: this.decrypt(connection) };
  }

  async listConnections(userId: string) {
    const rows = await this.prisma.messagingProviderConnection.findMany({
      where: { userId }, select: { id: true, provider: true, displayName: true, status: true, tokenExpiresAt: true, lastTestedAt: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const connected = new Set(rows.map((row) => row.provider));
    return {
      connections: rows,
      providers: [
        { provider: 'ARATTAI', label: 'Arattai Business', status: connected.has('ARATTAI') ? 'CONNECTED' : 'NOT_CONNECTED', ready: true },
        { provider: 'WHATSAPP_BUSINESS', label: 'WhatsApp Business', status: connected.has('WHATSAPP_BUSINESS') ? 'CONNECTED' : 'NOT_CONNECTED', ready: false },
        { provider: 'TELEGRAM', label: 'Telegram', status: connected.has('TELEGRAM') ? 'CONNECTED' : 'NOT_CONNECTED', ready: false },
      ],
    };
  }

  async connectArattai(userId: string, input: { accessToken: string; displayName?: string }) {
    const token = String(input.accessToken || '').trim();
    if (token.length < 20 || token.length > 8192 || /\s/.test(token)) throw new BadRequestException('Paste a valid Arattai Business access token.');
    const encrypted = this.encrypt(token);
    return this.prisma.messagingProviderConnection.upsert({
      where: { userId_provider: { userId, provider: PROVIDER } },
      create: { userId, provider: PROVIDER, displayName: String(input.displayName || 'Arattai Business').trim().slice(0, 120), status: 'CONNECTED', accessTokenCiphertext: encrypted.ciphertext, accessTokenNonce: encrypted.nonce, accessTokenTag: encrypted.tag },
      update: { displayName: String(input.displayName || 'Arattai Business').trim().slice(0, 120), status: 'CONNECTED', accessTokenCiphertext: encrypted.ciphertext, accessTokenNonce: encrypted.nonce, accessTokenTag: encrypted.tag, tokenExpiresAt: null },
      select: { id: true, provider: true, displayName: true, status: true, createdAt: true, updatedAt: true },
    });
  }

  async disconnect(userId: string, provider: string) {
    const normalized = String(provider || '').toUpperCase();
    if (!['ARATTAI', 'WHATSAPP_BUSINESS', 'TELEGRAM'].includes(normalized)) throw new BadRequestException('Unsupported messaging provider.');
    await this.prisma.messagingProviderConnection.deleteMany({ where: { userId, provider: normalized } });
    return { disconnected: true, provider: normalized };
  }

  async listConsents(userId: string) {
    const rows = await this.prisma.messagingRecipientConsent.findMany({
      where: { ownerId: userId, provider: PROVIDER, purpose: { in: [PURPOSE_PROMOTIONAL, 'TRANSACTIONAL'] } },
      select: { id: true, purpose: true, consentSource: true, consentNote: true, consentedAt: true, revokedAt: true, lastSentAt: true, recipientHash: true, recipientCiphertext: true, recipientNonce: true, recipientTag: true },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return rows.map((row) => {
      let hint = '••••'
      try { const phone = this.decrypt({ recipientCiphertext: row.recipientCiphertext, recipientNonce: row.recipientNonce, recipientTag: row.recipientTag }); hint = '••••' + phone.slice(-4) } catch { /* keep the contact masked */ }
      return { id: row.id, purpose: row.purpose, recipientHint: hint, consentSource: row.consentSource, consentNote: row.consentNote, consentedAt: row.consentedAt, revokedAt: row.revokedAt, lastSentAt: row.lastSentAt };
    });
  }

  async recordPromotionalConsent(userId: string, input: { phoneNumber: string; confirmed: boolean; source: string; purpose?: string; note?: string }) {
    if (input.confirmed !== true) throw new BadRequestException('Confirm that the recipient explicitly opted in to this message type.');
    const purpose = String(input.purpose || PURPOSE_PROMOTIONAL).toUpperCase();
    if (![PURPOSE_PROMOTIONAL, 'TRANSACTIONAL'].includes(purpose)) throw new BadRequestException('Unsupported messaging consent purpose.');
    const source = String(input.source || '').toUpperCase();
    if (!['IN_APP', 'WRITTEN', 'VERBAL', 'IMPORTED_WITH_PROOF'].includes(source)) throw new BadRequestException('Choose how the recipient consent was obtained.');
    const phone = this.normalizePhone(input.phoneNumber);
    const encrypted = this.encrypt(phone.digits);
    const recipientHash = createHash('sha256').update(userId + ':' + PROVIDER + ':' + phone.digits).digest('hex');
    return this.prisma.messagingRecipientConsent.upsert({
      where: { ownerId_provider_recipientHash_purpose: { ownerId: userId, provider: PROVIDER, recipientHash, purpose } },
      create: { ownerId: userId, provider: PROVIDER, recipientHash, recipientCiphertext: encrypted.ciphertext, recipientNonce: encrypted.nonce, recipientTag: encrypted.tag, purpose, consentSource: source, consentNote: String(input.note || '').trim().slice(0, 500) || null, consentedAt: new Date(), revokedAt: null },
      update: { recipientCiphertext: encrypted.ciphertext, recipientNonce: encrypted.nonce, recipientTag: encrypted.tag, consentSource: source, consentNote: String(input.note || '').trim().slice(0, 500) || null, consentedAt: new Date(), revokedAt: null },
      select: { id: true, consentSource: true, consentedAt: true, revokedAt: true },
    });
  }

  async revokeConsent(userId: string, consentId: string) {
    const result = await this.prisma.messagingRecipientConsent.updateMany({ where: { id: consentId, ownerId: userId, provider: PROVIDER, purpose: { in: [PURPOSE_PROMOTIONAL, 'TRANSACTIONAL'] }, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException('Active consent record not found.');
    return { revoked: true, consentId };
  }

  async sendTestPromotion(userId: string, input: PromotionInput) {
    const { connection, accessToken } = await this.connected(userId);
    const phone = this.normalizePhone(input.phoneNumber);
    const templateId = String(input.templateId || '').trim();
    if (!templateId || templateId.length > 120) throw new BadRequestException('Enter the approved Arattai template ID.');
    const variables = input.variables || {};
    if (!variables || Array.isArray(variables) || typeof variables !== 'object' || Object.values(variables).some((v) => typeof v !== 'string')) throw new BadRequestException('Template variables must be a JSON object of text values.');
    const response = await fetch(ARATTAI_API + '/promotions/test', {
      method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone.apiValue, id: templateId, language: input.language || 'en', mode: 'draft', variables }),
    });
    const result: any = await response.json().catch(() => null);
    if (!response.ok) throw new BadGatewayException({ message: 'Arattai test promotion was rejected.', providerStatus: response.status, providerMessage: result?.message || result?.error || 'Check the token, template and active test recipient in Arattai Business.' });
    await this.prisma.messagingProviderConnection.update({ where: { id: connection.id }, data: { lastTestedAt: new Date() } });
    return { accepted: true, provider: PROVIDER, message: 'Arattai accepted the test-message request.', acknowledgementKey: result?.data?.ack_key || null, providerUserId: result?.data?.user_id || null };
  }

  async sendTransactionalMessage(userId: string, input: SendPromotionInput) {
    const { connection, accessToken } = await this.connected(userId);
    const consent = await this.prisma.messagingRecipientConsent.findFirst({
      where: { id: input.consentId, ownerId: userId, provider: PROVIDER, purpose: 'TRANSACTIONAL', revokedAt: null },
    });
    if (!consent) throw new BadRequestException('No active transactional-message consent is recorded for this recipient.');
    const phone = this.normalizePhone(this.decrypt(consent));
    const templateId = String(input.templateId || '').trim();
    if (!templateId || templateId.length > 120) throw new BadRequestException('Enter the approved Arattai transactional template ID.');
    const variables = input.variables || {};
    if (!variables || Array.isArray(variables) || typeof variables !== 'object' || Object.values(variables).some((v) => typeof v !== 'string')) throw new BadRequestException('Template variables must be a JSON object of text values.');
    const payload: Record<string, unknown> = { id: templateId, phone_number: phone.apiValue, language: input.language || 'en', variables };
    if (input.authenticationCode) payload.authentication_code = String(input.authenticationCode).slice(0, 100);
    const response = await fetch(ARATTAI_API + '/transactions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result: any = await response.json().catch(() => null);
    if (!response.ok) throw new BadGatewayException({ message: 'Arattai rejected the transactional message.', providerStatus: response.status, providerMessage: result?.message || result?.error || 'Check template approval, OAuth scope and recipient eligibility.' });
    await this.prisma.$transaction([
      this.prisma.messagingRecipientConsent.update({ where: { id: consent.id }, data: { lastSentAt: new Date() } }),
      this.prisma.messagingProviderConnection.update({ where: { id: connection.id }, data: { lastTestedAt: new Date() } }),
    ]);
    return { accepted: true, provider: PROVIDER, message: 'Arattai accepted the transactional message request.', acknowledgementKey: result?.data?.ack_key || null, cost: result?.data?.cost || null };
  }

  async sendPromotionalMessage(userId: string, input: SendPromotionInput) {
    const { connection, accessToken } = await this.connected(userId);
    const consent = await this.prisma.messagingRecipientConsent.findFirst({
      where: { id: input.consentId, ownerId: userId, provider: PROVIDER, purpose: PURPOSE_PROMOTIONAL, revokedAt: null },
    });
    if (!consent) throw new BadRequestException('No active promotional consent is recorded for this recipient. Record consent first.');
    const phoneDigits = this.decrypt(consent);
    const phone = this.normalizePhone(phoneDigits);
    const templateId = String(input.templateId || '').trim();
    if (!templateId || templateId.length > 120) throw new BadRequestException('Enter the approved Arattai template ID.');
    const variables = input.variables || {};
    if (!variables || Array.isArray(variables) || typeof variables !== 'object' || Object.values(variables).some((v) => typeof v !== 'string')) throw new BadRequestException('Template variables must be a JSON object of text values.');
    const payload: Record<string, unknown> = { id: templateId, phone_number: phone.apiValue, language: input.language || 'en', variables };
    if (input.authenticationCode) payload.authentication_code = String(input.authenticationCode).slice(0, 100);
    const response = await fetch(ARATTAI_API + '/promotions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result: any = await response.json().catch(() => null);
    if (!response.ok) throw new BadGatewayException({ message: 'Arattai rejected the promotional message.', providerStatus: response.status, providerMessage: result?.message || result?.error || 'Check template approval, OAuth scope and recipient eligibility.' });
    await this.prisma.$transaction([
      this.prisma.messagingRecipientConsent.update({ where: { id: consent.id }, data: { lastSentAt: new Date() } }),
      this.prisma.messagingProviderConnection.update({ where: { id: connection.id }, data: { lastTestedAt: new Date() } }),
    ]);
    return { accepted: true, provider: PROVIDER, message: 'Arattai accepted the promotional message request.', acknowledgementKey: result?.data?.ack_key || null, cost: result?.data?.cost || null };
  }
}
