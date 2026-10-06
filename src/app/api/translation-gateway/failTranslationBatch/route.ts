import { handleGatewayRequest } from '@/lib/translation-gateway';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleGatewayRequest(request, 'failTranslationBatch');
}
