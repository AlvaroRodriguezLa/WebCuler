import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizedSession, setAuthCookies } from '../api/_lib/auth.mjs';

const authEnv = {
  GITHUB_APP_CLIENT_ID: 'test-client',
  GITHUB_APP_CLIENT_SECRET: 'test-secret',
  STUDIO_ALLOWED_USER_ID: '42',
  STUDIO_SESSION_SECRET: 'test-session-secret-for-email-otp',
};

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
  };
}

function cookieFor(payload) {
  const res = response();
  setAuthCookies(res, payload);
  return res.headers['Set-Cookie'][0].split(';', 1)[0];
}

function request(cookie) {
  return { method: 'GET', headers: { cookie } };
}

test('email OTP rejects old sessions and accepts only verified sessions', async () => {
  Object.assign(process.env, authEnv, { STUDIO_EMAIL_OTP_ENABLED: 'true' });

  const oldCookie = cookieFor({ id: 42, login: 'owner', accessToken: 'test-token' });
  const rejectedResponse = response();
  await assert.rejects(
    authorizedSession(request(oldCookie), rejectedResponse),
    (error) => error.status === 401,
  );
  assert.ok(rejectedResponse.headers['Set-Cookie'].some((cookie) => cookie.startsWith('one_shot_session=;')));

  const verifiedCookie = cookieFor({ id: 42, login: 'owner', accessToken: 'test-token', emailOtpVerified: true });
  const session = await authorizedSession(request(verifiedCookie), response());
  assert.equal(session.emailOtpVerified, true);
});

test('legacy sessions still work when email OTP is disabled', async () => {
  process.env.STUDIO_EMAIL_OTP_ENABLED = 'false';
  const cookie = cookieFor({ id: 42, login: 'owner', accessToken: 'test-token' });
  const session = await authorizedSession(request(cookie), response());
  assert.equal(session.id, 42);
});
