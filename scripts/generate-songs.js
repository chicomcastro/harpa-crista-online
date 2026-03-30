import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = path.join(__dirname, '..', 'data');
const outputFile = path.join(__dirname, '..', 'src', 'lib', 'songs.json');

async function generate() {
  const files = await fs.readdir(inputDir);

  const songs = (await Promise.all(
    files
      .filter(file => file.endsWith('.txt'))
      .map(async file => {
        const match = file.match(/^(\d+)\.\s*(.+)\.txt$/);
        if (!match) return null;

        const content = await fs.readFile(path.join(inputDir, file), 'utf-8');
        return {
          number: parseInt(match[1]),
          title: match[2].trim(),
          content: content.trim()
        };
      })
  ))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number)
    .map((song, i) => ({ id: i, ...song }));

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(songs));
  console.log(`Generated ${songs.length} songs → src/lib/songs.json`);
}

generate();
