import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PushTokensService } from '../push-tokens/push-tokens.service';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class PushService {
  private initialized = false;

  constructor(private readonly pushTokensService: PushTokensService) {}

  private ensureInitialized() {
    if (this.initialized) return;

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      // No inicializamos si no hay credenciales; simplemente no habrá push.
      this.initialized = true;
      return;
    }

    const parsed = JSON.parse(raw);
    const credential = admin.credential.cert(parsed);

    if (admin.apps.length === 0) {
      admin.initializeApp({ credential });
    }

    this.initialized = true;
  }

  async sendToUser(usuarioId: number, payload: PushPayload): Promise<void> {
    this.ensureInitialized();
    if (admin.apps.length === 0) return;

    const tokens = await this.pushTokensService.getActiveTokensForUser(usuarioId);
    if (!tokens.length) return;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/vite.svg',
          badge: '/vite.svg',
        } as any,
        fcmOptions: {
          link: '/',
        },
      },
    };

    const res = await admin.messaging().sendEachForMulticast(message);
    if (res.failureCount > 0) {
      res.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = (r.error as any)?.code as string | undefined;
        if (code === 'messaging/registration-token-not-registered') {
          void this.pushTokensService.deactivateToken(tokens[idx]);
        }
      });
    }
  }
}
