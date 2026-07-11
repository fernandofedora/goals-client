/**
 * Client-side translation of server-originated messages.
 *
 * The API returns a mix of English and Spanish `message` strings regardless of
 * the user's chosen language. This maps each known exact string to a stable
 * translation key (`errors.server.*`); unknown strings fall through to the raw
 * message so new/unmapped server errors still surface something useful.
 */

// Exact server string → translation key (under errors.server.*).
// Both English and Spanish source strings map to the same semantic key.
const SERVER_MESSAGE_KEYS = {
  // Auth middleware / rate limit
  'No token': 'errors.server.noToken',
  'Invalid token': 'errors.server.invalidToken',
  'Super Admin access required': 'errors.server.superAdminRequired',
  'Too many requests': 'errors.server.tooManyRequests',
  // Generic
  'Server error': 'errors.server.serverError',
  'Error del servidor': 'errors.server.serverError',
  'Server error during deletion': 'errors.server.deletionError',
  'Not found': 'errors.server.notFound',
  'Name is required': 'errors.server.nameRequired',
  'Invalid period': 'errors.server.invalidPeriod',
  // Auth flows
  'El correo electrónico ya está registrado':
    'errors.server.emailAlreadyRegistered',
  'Registro exitoso. Por favor verifica tu correo electrónico.':
    'errors.server.registrationSuccess',
  'Credenciales inválidas': 'errors.server.invalidCredentials',
  'Cuenta desactivada. Contacta a un administrador.':
    'errors.server.accountDeactivated',
  'Por favor verifica tu correo electrónico para iniciar sesión.':
    'errors.server.verifyEmailToLogin',
  'Token requerido': 'errors.server.tokenRequired',
  'El enlace es inválido o ya ha sido utilizado.':
    'errors.server.linkInvalidOrUsed',
  'Cuenta verificada exitosamente. Ya puedes iniciar sesión.':
    'errors.server.accountVerified',
  'Email requerido': 'errors.server.emailRequired',
  'Email required': 'errors.server.emailRequired',
  'Si el correo existe, se enviará un enlace de recuperación.':
    'errors.server.recoveryLinkSentIfExists',
  'Se ha enviado un enlace de recuperación a tu correo.':
    'errors.server.recoveryLinkSent',
  'Token y contraseña requeridos': 'errors.server.tokenAndPasswordRequired',
  'Token inválido o expirado': 'errors.server.invalidOrExpiredToken',
  'Contraseña actualizada correctamente.': 'errors.server.passwordUpdated',
  'Invalid bootstrap secret': 'errors.server.invalidBootstrapSecret',
  'User not found': 'errors.server.userNotFound',
  // User profile / password
  'Current password required to change email':
    'errors.server.currentPasswordRequiredEmail',
  'Invalid current password': 'errors.server.invalidCurrentPassword',
  'Current and new password required':
    'errors.server.currentAndNewPasswordRequired',
  'Weak password': 'errors.server.weakPassword',
  // Admin
  'Email already in use': 'errors.server.emailInUse',
  'isActive must be boolean': 'errors.server.isActiveBoolean',
  'You cannot deactivate your own account':
    'errors.server.cannotDeactivateSelf',
  'isSuperAdmin must be boolean': 'errors.server.isSuperAdminBoolean',
  'You cannot remove your own Super Admin role':
    'errors.server.cannotRemoveOwnSuperAdmin',
  'You cannot delete your own account': 'errors.server.cannotDeleteSelf',
  // Savings
  'Datos inválidos': 'errors.server.invalidData',
  'Categoría no permitida': 'errors.server.categoryNotAllowed',
  'Plan no encontrado': 'errors.server.planNotFound',
  'Plan no permitido': 'errors.server.planNotAllowed',
  'Contribución no encontrada': 'errors.server.contributionNotFound',
};

/**
 * Translate a raw server message string. Returns the translation for a known
 * message, or the raw string when unmapped/empty.
 */
export function translateServerMessage(msg, t) {
  if (!msg) return '';
  const key = SERVER_MESSAGE_KEYS[msg];
  return key ? t(key) : msg;
}

/**
 * Translate the error message from a failed API call.
 * @param {unknown} err - axios error
 * @param {import('i18next').TFunction} t
 * @param {string} fallbackKey - i18n key used when the server sent no message
 */
export function translateServerError(err, t, fallbackKey = 'errors.generic') {
  const msg = err?.response?.data?.message;
  if (!msg) return t(fallbackKey);
  const key = SERVER_MESSAGE_KEYS[msg];
  return key ? t(key) : msg;
}
