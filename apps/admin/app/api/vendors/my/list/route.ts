import { forwardJson } from '../../../_lib/backend';

export async function GET(request: Request) {
  const token = request.headers.get('authorization');
  return forwardJson('/vendors/my/list', {
    method: 'GET',
    headers: token ? { authorization: token } : {},
  });
}
