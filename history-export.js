import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

export async function createHistoryWorkbook(rows, uploadsDir = path.resolve("uploads"), imageLoader) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroCare AI";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Lich su nhan dien");
    // Set keys without headers so the merged report title is not overwritten.
    sheet.columns = [
        { key: "id", width: 10 }, { key: "disease", width: 30 },
        { key: "level", width: 18 }, { key: "solution", width: 60 },
        { key: "image", width: 30 }, { key: "created_at", width: 25 }
    ];
    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = "AGROCARE AI - LỊCH SỬ NHẬN DIỆN BỆNH CÂY TRỒNG";
    sheet.getRow(1).height = 35;
    sheet.getRow(2).values = ["STT", "Tên bệnh", "Mức độ", "Hướng xử lý", "Hình ảnh", "Thời gian"];
    sheet.getRow(2).height = 25;
    for (const number of [1, 2]) {
        const row = sheet.getRow(number);
        row.font = { bold: true, size: number === 1 ? 16 : 11, color: { argb: "FFFFFFFF" } };
        row.alignment = { horizontal: "center", vertical: "middle" };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
    }
    for (const [index, item] of rows.entries()) {
        const row = sheet.addRow({
            id: index + 1, disease: item.disease || "Chưa xác định",
            level: item.level || "Chưa xác định", solution: item.solution || "",
            created_at: item.created_at || ""
        });
        row.height = 135;
        row.alignment = { vertical: "middle", wrapText: true };
        for (let col = 1; col <= 6; col++) {
            row.getCell(col).border = Object.fromEntries(
                ["top", "left", "bottom", "right"].map(side => [side, { style: "thin" }])
            );
        }
        const cell = row.getCell(5);
        if (!item.image) { cell.value = "Không có ảnh"; continue; }
        if (!imageLoader && (typeof item.image !== "string" || /[\\/]/.test(item.image) || item.image === "." || item.image === "..")) {
            cell.value = "Tên ảnh không hợp lệ";
            continue;
        }
        let source;
        try { source = imageLoader ? await imageLoader(item) : await fs.readFile(path.join(uploadsDir, item.image)); }
        catch (error) {
            if (error.code !== "ENOENT") throw error;
            cell.value = "Không tìm thấy ảnh";
            continue;
        }
        // Convert all supported uploads (including WebP) to an Excel-compatible PNG.
        let thumbnail;
        try {
            thumbnail = await sharp(source).rotate().resize(190, 160, { fit: "inside" }).png().toBuffer({ resolveWithObject: true });
        } catch {
            cell.value = "Không đọc được ảnh";
            continue;
        }
        const imageId = workbook.addImage({ buffer: thumbnail.data, extension: "png" });
        sheet.addImage(imageId, {
            tl: { col: 4.05, row: row.number - 1 + 0.05 },
            ext: { width: thumbnail.info.width, height: thumbnail.info.height },
            editAs: "oneCell"
        });
    }
    return workbook;
}
