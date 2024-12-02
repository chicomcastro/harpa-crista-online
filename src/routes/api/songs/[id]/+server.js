import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET({ params }) {
  try {
    const { id } = params;
    const filePath = path.join(process.cwd(), 'src/input', id);
    const content = await fs.readFile(filePath, 'utf-8');
    
    const title = id.replace(/^\d+\.\s*/, '').replace(/\.txt$/, '');
    
    return json({
      title,
      content
    });
  } catch (error) {
    console.error('Error reading song:', error);
    return new Response('Song not found', { status: 404 });
  }
} 