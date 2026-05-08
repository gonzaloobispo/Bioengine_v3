/**
 * emailNotifications.ts
 *
 * Notificaciones por email para eventos críticos del sistema BioEngine.
 * Usa nodemailer con Gmail SMTP.
 *
 * Si GMAIL_USER o GMAIL_APP_PASSWORD no están configurados, las funciones
 * hacen log de advertencia y retornan silenciosamente sin lanzar error.
 */

import nodemailer from 'nodemailer';

function getTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
}

function getOwnerEmail(): string {
    return (
        process.env.NOTIFICATION_EMAIL ||
        process.env.GMAIL_USER ||
        ''
    );
}

/**
 * Notifica a Gonzalo que un nuevo usuario está pendiente de aprobación.
 */
export async function sendNewUserNotification(
    uid: string,
    email: string,
    nombre: string
): Promise<void> {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('[emailNotifications] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — omitiendo email de nuevo usuario.');
        return;
    }

    const ownerEmail = getOwnerEmail();
    if (!ownerEmail) {
        console.warn('[emailNotifications] NOTIFICATION_EMAIL no configurado — omitiendo email de nuevo usuario.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"BioEngine" <${process.env.GMAIL_USER}>`,
            to: ownerEmail,
            subject: `[BioEngine] Nuevo usuario pendiente: ${nombre || uid}`,
            text: [
                'Se ha registrado un nuevo usuario en BioEngine y está pendiente de aprobación.',
                '',
                `Nombre:  ${nombre || '(sin nombre)'}`,
                `Email:   ${email || '(sin email)'}`,
                `UID:     ${uid}`,
                '',
                'Para aprobar o rechazar el acceso:',
                `POST /api-cloud/admin/users/${uid}/status`,
                '',
                'Body: { "status": "active" }  o  { "status": "rejected" }',
                '',
                '-- BioEngine System'
            ].join('\n'),
        });
        console.info(`[emailNotifications] Email de nuevo usuario enviado a ${ownerEmail} (uid: ${uid})`);
    } catch (err: any) {
        console.error('[emailNotifications] Error enviando email de nuevo usuario:', err.message);
    }
}

/**
 * Notifica al usuario que su solicitud fue aprobada o rechazada.
 */
export async function sendUserApprovalNotification(
    userEmail: string,
    approved: boolean,
    nombre: string
): Promise<void> {
    if (!userEmail) {
        console.warn('[emailNotifications] userEmail vacío — omitiendo email de aprobación.');
        return;
    }

    const transporter = getTransporter();
    if (!transporter) {
        console.warn('[emailNotifications] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — omitiendo email de aprobación.');
        return;
    }

    const subject = approved
        ? '[BioEngine] Tu cuenta ha sido aprobada'
        : '[BioEngine] Solicitud de acceso rechazada';

    const body = approved
        ? [
            `Hola ${nombre || ''},`,
            '',
            'Tu solicitud de acceso a BioEngine ha sido aprobada.',
            'Ya puedes iniciar sesión y acceder al dashboard completo.',
            '',
            '-- BioEngine System'
          ].join('\n')
        : [
            `Hola ${nombre || ''},`,
            '',
            'Lamentablemente tu solicitud de acceso a BioEngine no ha sido aprobada en este momento.',
            'Si crees que esto es un error, contacta al administrador.',
            '',
            '-- BioEngine System'
          ].join('\n');

    try {
        await transporter.sendMail({
            from: `"BioEngine" <${process.env.GMAIL_USER}>`,
            to: userEmail,
            subject,
            text: body,
        });
        console.info(`[emailNotifications] Email de ${approved ? 'aprobación' : 'rechazo'} enviado a ${userEmail}`);
    } catch (err: any) {
        console.error('[emailNotifications] Error enviando email de aprobación:', err.message);
    }
}

/**
 * Notifica a Gonzalo que un usuario propuso un nuevo ítem de catálogo.
 */
export async function sendCatalogProposalNotification(
    proposedBy: string,
    type: string,
    value: string
): Promise<void> {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('[emailNotifications] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — omitiendo email de propuesta de catálogo.');
        return;
    }

    const ownerEmail = getOwnerEmail();
    if (!ownerEmail) {
        console.warn('[emailNotifications] NOTIFICATION_EMAIL no configurado — omitiendo email de propuesta de catálogo.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"BioEngine" <${process.env.GMAIL_USER}>`,
            to: ownerEmail,
            subject: `[BioEngine] Nueva propuesta de catálogo: ${value}`,
            text: [
                'Un usuario ha propuesto un nuevo ítem para el catálogo de BioEngine.',
                '',
                `Tipo:         ${type}`,
                `Valor:        ${value}`,
                `Propuesto por: ${proposedBy}`,
                '',
                'Revisa y aprueba o rechaza desde el panel admin:',
                'GET  /api-cloud/admin/catalog/proposals',
                'POST /api-cloud/admin/catalog/approve',
                '',
                '-- BioEngine System'
            ].join('\n'),
        });
        console.info(`[emailNotifications] Email de propuesta de catálogo enviado a ${ownerEmail} (type: ${type}, value: ${value})`);
    } catch (err: any) {
        console.error('[emailNotifications] Error enviando email de propuesta de catálogo:', err.message);
    }
}
