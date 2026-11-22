import { Linking } from 'react-native';

import { logActivity } from '@/lib/data';
import type { EntityType } from '@/lib/types';
import { Button, Row } from './ui';

function digits(phone: string) {
  const d = phone.replace(/\D/g, '');
  // Assume Indian numbers when 10 digits.
  return d.length === 10 ? '91' + d : d;
}

/** Call / WhatsApp / Email shortcuts. Each tap is logged on the record's timeline. */
export function ContactButtons({
  phone,
  email,
  entityType,
  entityId,
  onLogged,
}: {
  phone?: string | null;
  email?: string | null;
  entityType: EntityType;
  entityId: string;
  onLogged?: () => void;
}) {
  if (!phone && !email) return null;
  const log = async (kind: string, note: string) => {
    try {
      await logActivity(entityType, entityId, kind, note);
      onLogged?.();
    } catch {
      // Logging is best-effort.
    }
  };
  return (
    <Row style={{ marginBottom: 12 }}>
      {phone ? (
        <Button
          small
          variant="secondary"
          title="Call"
          onPress={() => {
            Linking.openURL(`tel:${phone}`);
            log('call', `Called ${phone}`);
          }}
        />
      ) : null}
      {phone ? (
        <Button
          small
          variant="secondary"
          title="WhatsApp"
          onPress={() => {
            Linking.openURL(`https://wa.me/${digits(phone)}`);
            log('whatsapp', `WhatsApp to ${phone}`);
          }}
        />
      ) : null}
      {email ? (
        <Button
          small
          variant="secondary"
          title="Email"
          onPress={() => {
            Linking.openURL(`mailto:${email}`);
            log('email', `Emailed ${email}`);
          }}
        />
      ) : null}
    </Row>
  );
}
