import ExcelJS from "exceljs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "./database.js";
import { detectPlantDisease } from "./gemini.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================
# TẠO THƯ MỤC
============================================ */

if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

/* ============================================
# MIDDLEWARE
============================================ */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static("public"));

app.use("/uploads", express.static("uploads"));

/* ============================================
# MULTER
============================================ */

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, "uploads");

    },

    filename(req, file, cb) {

        const ext = path.extname(file.originalname);

        cb(
            null,
            Date.now() + ext
        );

    }

});

const upload = multer({

    storage,

    limits: {

        fileSize: 10 * 1024 * 1024

    }

});
/* ============================================
# API TRANG CHỦ
============================================ */

app.get("/", (req, res) => {

    res.sendFile(path.resolve("public/index.html"));

});

/* ============================================
# KIỂM TRA SERVER
============================================ */

app.get("/api/ping", (req, res) => {

    res.json({

        success: true,

        message: "Server Online"

    });

});

/* ============================================
# KIỂM TRA AI
============================================ */

app.get("/api/check-ai", (req, res) => {

    res.json({

        success: true,

        ai: true

    });

});

/* ============================================
# NHẬN DIỆN BỆNH CÂY
============================================ */

app.post(

    "/api/detect",

    upload.single("image"),

    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message: "Chưa chọn ảnh"

                });

            }

            const result = await detectPlantDisease(

                req.file.path

            );

            res.json({

                success: true,

                image: req.file.filename,

                result

            });

        }

        catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                error: error.message

            });

        }

    }

);
/* ============================================
# LƯU LỊCH SỬ NHẬN DIỆN
============================================ */

app.post("/api/history", (req, res) => {

    const {

        image,

        disease,

        solution,

        level

    } = req.body;

    db.run(

        `

        INSERT INTO history(

            image,

            disease,

            solution,

            level

        )

        VALUES(?,?,?,?)

        `,

        [

            image,

            disease,

            solution,

            level

        ],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true,

                id:this.lastID

            });

        }

    );

});

/* ============================================
# LẤY LỊCH SỬ
============================================ */

app.get("/api/history", (req,res)=>{

    db.all(

        `

        SELECT *

        FROM history

        ORDER BY id DESC

        `,

        [],

        (error,rows)=>{

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true,

                data:rows

            });

        }

    );

});

/* ============================================
# XÓA TOÀN BỘ LỊCH SỬ
============================================ */

app.delete("/api/history",(req,res)=>{

    db.run(

        `DELETE FROM history`,

        [],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true

            });

        }

    );

});
/* ============================================
# GỬI ĐÁNH GIÁ
============================================ */

app.post("/api/reviews", (req, res) => {

    const {

        name,

        star,

        content

    } = req.body;

    db.run(

        `

        INSERT INTO reviews(

            name,

            star,

            content

        )

        VALUES(?,?,?)

        `,

        [

            name,

            star,

            content

        ],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true,

                id:this.lastID

            });

        }

    );

});

/* ============================================
# LẤY DANH SÁCH ĐÁNH GIÁ
============================================ */

app.get("/api/reviews", (req, res) => {

    db.all(

        `

        SELECT *

        FROM reviews

        ORDER BY id DESC

        `,

        [],

        (error, rows) => {

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true,

                data:rows

            });

        }

    );

});

/* ============================================
# SỬA ĐÁNH GIÁ
============================================ */

app.put("/api/reviews/:id", (req, res) => {

    const { id } = req.params;

    const {

        name,

        content

    } = req.body;

    db.run(

        `

        UPDATE reviews

        SET

            name=?,

            content=?

        WHERE id=?

        `,

        [

            name,

            content,

            id

        ],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true

            });

        }

    );

});

/* ============================================
# XÓA ĐÁNH GIÁ
============================================ */

app.delete("/api/reviews/:id", (req, res) => {

    const { id } = req.params;

    db.run(

        `

        DELETE FROM reviews

        WHERE id=?

        `,

        [id],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true

            });

        }

    );

});

/* ============================================
# LIKE ĐÁNH GIÁ
============================================ */

app.post("/api/reviews/:id/like", (req, res) => {

    const { id } = req.params;

    db.run(

        `

        UPDATE reviews

        SET likes = likes + 1

        WHERE id=?

        `,

        [id],

        function(error){

            if(error){

                return res.status(500).json({

                    success:false,

                    error:error.message

                });

            }

            res.json({

                success:true

            });

        }

    );

});
/* ============================================
# THỐNG KÊ
============================================ */

app.get("/api/statistics", (req, res) => {

    db.all(

        `SELECT level FROM history`,

        [],

        (error, rows) => {

            if (error) {

                return res.status(500).json({

                    success: false,

                    error: error.message

                });

            }

            const statistics = {

                total: rows.length,

                light: 0,

                medium: 0,

                heavy: 0

            };

            rows.forEach(item => {

                switch (item.level) {

                    case "Nhẹ":

                        statistics.light++;

                        break;

                    case "Trung bình":

                        statistics.medium++;

                        break;

                    case "Nặng":

                        statistics.heavy++;

                        break;

                }

            });

            res.json({

                success: true,

                statistics

            });

        }

    );

});

/* ============================================
# KHỞI ĐỘNG SERVER
============================================ */

app.listen(PORT, () => {

    console.log("");

    console.log("🌿 AgroCare AI");

    console.log("🚀 Server đang chạy");

    console.log(`http://localhost:${PORT}`);

});

/* ============================================
   XUẤT LỊCH SỬ NHẬN DIỆN RA EXCEL
============================================ */

app.get("/api/history/export-excel", (req, res) => {

    db.all(
        `
        SELECT *
        FROM history
        ORDER BY id DESC
        `,
        [],
        async (error, rows) => {

            if (error) {
                return res.status(500).json({
                    success: false,
                    error: error.message
                });
            }

            try {

                const workbook = new ExcelJS.Workbook();

                workbook.creator = "AgroCare AI";
                workbook.created = new Date();

                const worksheet = workbook.addWorksheet(
                    "Lich su nhan dien"
                );

                // TIÊU ĐỀ
                worksheet.mergeCells("A1:F1");

                worksheet.getCell("A1").value =
                    "AGROCARE AI - LỊCH SỬ NHẬN DIỆN BỆNH CÂY TRỒNG";

                worksheet.getCell("A1").font = {
                    bold: true,
                    size: 16,
                    color: { argb: "FFFFFFFF" }
                };

                worksheet.getCell("A1").alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                worksheet.getCell("A1").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF15803D" }
                };

                worksheet.getRow(1).height = 35;

                // TIÊU ĐỀ CỘT
                worksheet.columns = [
                    { header: "STT", key: "id", width: 10 },
                    { header: "Tên bệnh", key: "disease", width: 30 },
                    { header: "Mức độ", key: "level", width: 18 },
                    { header: "Hướng xử lý", key: "solution", width: 45 },
                    { header: "Tên ảnh", key: "image", width: 25 },
                    { header: "Thời gian", key: "created_at", width: 25 }
                ];

                worksheet.addRow([]);

                const headerRow = worksheet.getRow(2);

                headerRow.values = [
                    "STT",
                    "Tên bệnh",
                    "Mức độ",
                    "Hướng xử lý",
                    "Tên ảnh",
                    "Thời gian"
                ];

                headerRow.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                headerRow.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                headerRow.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF16A34A" }
                };

                // THÊM DỮ LIỆU
                rows.forEach((item, index) => {

                    worksheet.addRow({
                        id: index + 1,
                        disease: item.disease || "Chưa xác định",
                        level: item.level || "Chưa xác định",
                        solution: item.solution || "",
                        image: item.image || "",
                        created_at: item.created_at || ""
                    });

                });

                // ĐỊNH DẠNG BẢNG
                worksheet.eachRow((row, rowNumber) => {

                    if (rowNumber >= 3) {

                        row.alignment = {
                            vertical: "middle",
                            wrapText: true
                        };

                        row.height = 30;

                        row.eachCell(cell => {

                            cell.border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            };

                        });

                    }

                });

                // THIẾT LẬP TÊN FILE
                const filename = "AgroCare_AI_Thong_Ke.xlsx";

                res.setHeader(
                    "Content-Type",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                );

                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${filename}"`
                );

                const buffer = await workbook.xlsx.writeBuffer();

                res.send(Buffer.from(buffer));

            } catch (err) {

                console.error(err);

                res.status(500).json({
                    success: false,
                    error: err.message
                });

            }

        }
    );

});
