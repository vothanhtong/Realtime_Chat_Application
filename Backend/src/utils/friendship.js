import Friend from "../models/Friend.js";

/**
 * Low-level friendship queries shared by friendService AND presenceService.
 * Kept outside services/ on purpose: friendService depends on presenceService
 * (to announce presence to new friends), so presenceService cannot depend on
 * friendService without creating a cycle.
 */

/** Normalize a user-pair so userA < userB (lexicographic) — matches Friend pre-save hook */
export const normalizePair = (a, b) => {
  const sa = a.toString();
  const sb = b.toString();
  return sa < sb ? [sa, sb] : [sb, sa];
};

/** Resolves truthy when the two users are friends */
export const areFriends = (a, b) => {
  const [userA, userB] = normalizePair(a, b);
  return Friend.exists({ userA, userB });
};

/** All friend ids (strings) of a user — uses the {userA} and {userB} indexes */
export const getFriendIds = async (userId) => {
  const id = userId.toString();
  const rows = await Friend.find(
    { $or: [{ userA: id }, { userB: id }] },
    { userA: 1, userB: 1 }
  ).lean();
  return rows.map((f) => (f.userA.toString() === id ? f.userB : f.userA).toString());
};
