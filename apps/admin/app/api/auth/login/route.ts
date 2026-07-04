import { forwardJson } from '../../_lib/backend';

export async function POST(request: Request) {
  return forwardJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify(await request.json()),
  });
}
