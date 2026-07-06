import { forwardJson } from '../../../_lib/backend';

type RouteContext = {
  params: Promise<{ vendorId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { vendorId } = await context.params;
  const token = request.headers.get('authorization');
  return forwardJson(`/vendors/${vendorId}/hours`, {
    method: 'PUT',
    body: JSON.stringify(await request.json()),
    headers: token ? { authorization: token } : {},
  });
}
