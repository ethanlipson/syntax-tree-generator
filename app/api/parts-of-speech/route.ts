import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { sentence } = await request.json();

  const parseResponse = await fetch('http://18.117.106.251:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sentence }),
  });
  const parsed = await parseResponse.json();

  return new NextResponse(JSON.stringify({ partsOfSpeech: parsed }), {
    status: 200,
  });
}
