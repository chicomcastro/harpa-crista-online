import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import { join } from 'path';

export async function GET({ params }) {
  try {
    const { id } = params;
    const inputDir = join(process.cwd(), 'static', 'data');
    const filePath = join(inputDir, id);

    const content = await fs.readFile(filePath, 'utf-8');
    const match = id.match(/^(\d+)\.\s*(.+)\.txt$/);

    if (!match) {
      return new Response('Song not found', { status: 404 });
    }

    return json({
      id,
      number: parseInt(match[1]),
      title: match[2].trim(),
      content
    });
  } catch (error) {
    console.error('Error reading song:', error);
    return new Response('Song not found', { status: 404 });
  }
} 