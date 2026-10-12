const { ROLES, ROLE_DEFAULT_PERMISSIONS } = require('../config/constants');

/**
 * Kya is user ke paas ye permission hai? (PBAC — role ka naam nahi, asal permission)
 *
 * Pehle kai services sirf `role === 'receptionist' || 'super-admin'` dekhti thin, is
 * liye admin agar kisi aur staff ko bookings:view / bookings:cancel deta to bhi
 * wo 403 paata. Super-admin hamesha allowed. Agar sirf role mila (purane callers /
 * tests) to us role ki default permissions mani jati hain.
 *
 * @param {{ role?: string, permissions?: string[] }|null} actor - req.user ya { role }
 * @param {string} permission - PERMISSIONS.* value
 * @returns {boolean}
 */
const hasPermission = (actor, permission) => {
  if (!actor) return false;
  if (actor.role === ROLES.SUPER_ADMIN) return true;
  // Guest kabhi staff nahi — saved permissions (purane accounts me bookings:view) nazar-andaz
  if (actor.role === ROLES.GUEST) {
    return (ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST] || []).includes(permission);
  }
  const granted = Array.isArray(actor.permissions)
    ? actor.permissions
    : ROLE_DEFAULT_PERMISSIONS[actor.role] || [];
  return granted.includes(permission);
};

module.exports = { hasPermission };
