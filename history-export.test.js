import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { createHistoryWorkbook } from './history-export.js';

test('Excel embeds uploaded image in column E and preserves title', async t => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-export-'));
 t.after(() => fs.rm(dir, { recursive: true, force: true }));
 const png = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#15803d' } }).png().toBuffer();
 await fs.writeFile(path.join(dir, 'leaf.png'), png);
 const workbook = await createHistoryWorkbook([
  { image: 'leaf.png', disease: 'Test disease' },
  { image: 'missing.jpg' },
  { image: '../outside.png' }
 ], dir);
 const loaded = new ExcelJS.Workbook();
 await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
 const sheet = loaded.worksheets[0];
 assert.match(sheet.getCell('A1').value, /AGROCARE AI/);
 assert.equal(sheet.getCell('E2').value, 'Hình ảnh');
 assert.equal(sheet.getCell('E3').value, null);
 assert.equal(sheet.getCell('B3').value, 'Test disease');
 const images = sheet.getImages();
 assert.equal(images.length, 1);
 assert.equal(images[0].range.tl.nativeCol, 4);
 assert.equal(images[0].range.tl.nativeRow, 2);
 assert.ok(loaded.getImage(images[0].imageId).buffer.length > 0);
 assert.ok(sheet.getRow(3).height >= 100);
 assert.equal(sheet.getCell('E4').value, 'Không tìm thấy ảnh');
 assert.equal(sheet.getCell('E5').value, 'Tên ảnh không hợp lệ');
});
