import fs from "fs";

export async function sortedReaddir(dir: string): Promise<string[]> {
  return (await fs.promises.readdir(dir)).sort();
}
