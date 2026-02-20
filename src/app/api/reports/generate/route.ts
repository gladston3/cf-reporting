import { NextResponse } from 'next/server';

import { validateGenerateRequest, handleGenerate } from '@/lib/reports/generate';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateGenerateRequest(body);
  if (!validation.success) {
    const message = validation.error.errors.map((e) => e.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = await handleGenerate(validation.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return new Response(result.html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
