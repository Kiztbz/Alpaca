import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = "public/assets/images/llama-face-v2.png";
const png = await sharp(source)
  .resize(64, 64, { fit: "cover" })
  .png()
  .toBuffer();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = 64;
entry[1] = 64;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(header.length + entry.length, 12);

await writeFile("app/favicon.ico", Buffer.concat([header, entry, png]));
await sharp(source)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile("app/icon.png");

console.log("Generated app/favicon.ico and app/icon.png from the white Alpaca face.");
