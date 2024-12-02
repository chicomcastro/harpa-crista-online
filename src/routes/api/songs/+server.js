import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { join } from 'path';

export async function GET() {
  try {
    const inputDir = join(process.cwd(), 'static', 'data');
    const files = await fs.readdir(inputDir);
    
    const songs = (await Promise.all(files
      .filter(file => file.endsWith('.txt'))
      .map(async file => {
        const match = file.match(/^(\d+)\.\s*(.+)\.txt$/);
        if (match) {
          return {
            id: file,
            number: parseInt(match[1]),
            title: match[2].trim(),
            filename: file,
            content: await fs.readFile(path.join(inputDir, file), 'utf-8')
          };
        }
        return null;
      })))
      .filter(Boolean)
      .sort((a, b) => (a?.number || 0) - (b?.number || 0));

    return json(songs);
  } catch (error) {
    console.error('Error reading songs:', error);
    return json([]);
  }
} 