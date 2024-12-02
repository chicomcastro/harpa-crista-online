import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const inputDir = path.join(process.cwd(), 'src/input');
    const files = await fs.readdir(inputDir);
    
    const songs = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const match = file.match(/^(\d+)\.\s*(.+)\.txt$/);
        if (match) {
          return {
            id: file,
            number: parseInt(match[1]),
            title: match[2].trim(),
            filename: file
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (a?.number || 0) - (b?.number || 0));

    return json(songs);
  } catch (error) {
    console.error('Error reading songs:', error);
    return json([]);
  }
} 