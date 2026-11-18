let counter = 0;

/**
 * Sign up + sign in a fresh user through the public API.
 * @returns {{ id, username, email, token, cookie }}
 */
export const createUser = async (api, overrides = {}) => {
  counter += 1;
  const username = overrides.username ?? `user${Date.now().toString(36)}${counter}`;
  const email = overrides.email ?? `${username}@test.dev`;
  const password = overrides.password ?? "secret123";

  const signup = await api()
    .post("/api/auth/signup")
    .send({ username, password, email, firstName: overrides.firstName ?? "Test", lastName: "User" });
  if (signup.status !== 201) {
    throw new Error(`signup failed ${signup.status}: ${JSON.stringify(signup.body)}`);
  }

  const signin = await api().post("/api/auth/signin").send({ username, password });
  const cookie = signin.headers["set-cookie"]?.find((c) => c.startsWith("refreshToken="));
  const me = await api().get("/api/users/me").set("Authorization", `Bearer ${signin.body.accessToken}`);

  return {
    id: me.body.user._id,
    username,
    email,
    password,
    token: signin.body.accessToken,
    cookie: cookie?.split(";")[0],
  };
};

export const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

/** a sends a friend request, b accepts it */
export const makeFriends = async (api, a, b) => {
  await api().post("/api/friends/requests").set(auth(a)).send({ to: b.id });
  const list = await api().get("/api/friends/requests").set(auth(b));
  const request = list.body.received.find((r) => r.from._id === a.id);
  if (!request) throw new Error("friend request not found");
  const accepted = await api().post(`/api/friends/requests/${request._id}/accept`).set(auth(b));
  if (accepted.status !== 200) throw new Error(`accept failed ${accepted.status}`);
};
