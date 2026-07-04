import { forwardJson } from '../../_lib/backend';

export async function POST(request: Request) {
  const token = request.headers.get('authorization');
  return forwardJson('/vendors/onboarding', {
    method: 'POST',
    body: JSON.stringify(await request.json()),
    headers: token ? { authorization: token } : {},
  });
}
