import { forwardJson } from '../../../_lib/backend';

type RouteContext = {
  params: Promise<{ vendorId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { vendorId } = await context.params;
  const token = request.headers.get('authorization');
  return forwardJson(`/vendors/${vendorId}/location`, {
    method: 'POST',
    body: JSON.stringify(await request.json()),
    headers: token ? { authorization: token } : {},
  });
}
