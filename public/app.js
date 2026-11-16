/* ============================================================
# CẤU HÌNH
============================================================ */

const API_URL = "http://localhost:3000";

/* ============================================================
# GỬI REQUEST
============================================================ */

async function api(url, options = {}) {

    const response = await fetch(API_URL + url, {

        headers: {

            "Content-Type": "application/json"

        },

        ...options

    });

    return await response.json();

}

/* ============================================================
# THÔNG BÁO
============================================================ */

function showToast(message, type = "success") {

    Swal.fire({

        toast: true,

        position: "top-end",

        icon: type,

        title: message,

        timer: 2000,

        showConfirmButton: false

    });

}
/* ============================================================
# CHỌN ẢNH
============================================================ */

const imageInput = document.getElementById("imageInput");

const previewImage = document.getElementById("previewImage");

if(imageInput){

    imageInput.onchange = function(){

        const file = this.files[0];

        if(!file) return;

        previewImage.src = URL.createObjectURL(file);

        previewImage.classList.remove("hidden");

    }

}
/* ============================================================
# NHẬN DIỆN
============================================================ */

const detectButton = document.getElementById("detectButton");

if(detectButton){

detectButton.onclick = async ()=>{

const file=imageInput.files[0];

if(!file){

showToast(

"Bạn chưa chọn ảnh",

"warning"

);

return;

}

const form=new FormData();

form.append(

"image",

file

);

showLoading();

const response=await fetch(

API_URL+"/api/detect",

{

method:"POST",

body:form

}

);

const result=await response.json();

hideLoading();

if(!result.success){

showToast(

"Lỗi nhận diện",

"error"

);

return;

}

displayResult(result);

};

}
/* ============================================================
# HIỂN THỊ KẾT QUẢ
============================================================ */

function displayResult(data){

const box=document.getElementById(

"resultBox"

);

box.classList.remove(

"hidden"

);

document.getElementById(

"disease"

).innerText=data.result;

}
/* ============================================================
# LOADING
============================================================ */

function showLoading(){

Swal.fire({

title:"Đang phân tích...",

text:"AI đang nhận diện bệnh cây",

allowOutsideClick:false,

didOpen(){

Swal.showLoading();

}

});

}

function hideLoading(){

Swal.close();

}
/* ============================================================
# TẢI DANH SÁCH ĐÁNH GIÁ TỪ SERVER
============================================================ */

async function loadReviews(){

    try{

        const response = await api("/api/reviews");

        if(!response.success){

            showToast(

                "Không tải được đánh giá",

                "error"

            );

            return;

        }

        reviews = response.data;

        renderReviews();

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# GỬI ĐÁNH GIÁ LÊN SERVER
============================================================ */

if(sendReview){

sendReview.onclick = async ()=>{

const name = reviewName.value.trim();

const star = Number(reviewStar.value);

const content = reviewContent.value.trim();

if(name===""){

showToast(

"Vui lòng nhập tên",

"warning"

);

return;

}

if(content===""){

showToast(

"Vui lòng nhập đánh giá",

"warning"

);

return;

}

const result = await api(

"/api/reviews",

{

method:"POST",

body:JSON.stringify({

name,

star,

content

})

}

);

if(!result.success){

showToast(

"Gửi thất bại",

"error"

);

return;

}

reviewName.value="";

reviewContent.value="";

reviewStar.value="5";

showToast(

"Cảm ơn bạn đã đánh giá ❤️"

);

await loadReviews();

};

}
/* ============================================================
# HIỂN THỊ REVIEW
============================================================ */

function renderReviews(){

if(!reviewList) return;

reviewList.innerHTML="";

if(reviews.length===0){

reviewList.innerHTML=`

<div class="emptyState">

<i class="fa-solid fa-comments"></i>

<h3>

Chưa có đánh giá

</h3>

<p>

Hãy là người đầu tiên đánh giá AgroCare AI.

</p>

</div>

`;

averageRating.innerHTML="0.0 (0 đánh giá)";

return;

}

let total=0;

reviews.forEach(review=>{

total+=review.star;

reviewList.innerHTML+=`

<div class="border rounded-xl p-5 mb-4 shadow">

<div class="flex justify-between">

<div>

<h3 class="font-bold">

${review.name}

</h3>

<small class="text-gray-500">

${review.created_at??""}

</small>

</div>

<div class="text-yellow-500">

${"★".repeat(review.star)}

</div>

</div>

<p class="mt-3">

${review.content}

</p>

</div>

`;

});

const avg=(total/reviews.length).toFixed(1);

averageRating.innerHTML=`

${avg}

(${reviews.length} đánh giá)

`;

}
/* ============================================================
# KHỞI TẠO
============================================================ */

window.addEventListener(

"DOMContentLoaded",

async ()=>{

await loadReviews();

}

);
/* ============================================================
# LƯU LỊCH SỬ NHẬN DIỆN
============================================================ */

async function saveHistory(result){

    try{

        await api(

            "/api/history",

            {

                method:"POST",

                body:JSON.stringify({

                    image:result.image,

                    disease:result.result.disease,

                    solution:result.result.solution,

                    level:result.result.level

                })

            }

        );

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# TẢI LỊCH SỬ
============================================================ */

async function loadHistory(){

    try{

        const response=await api("/api/history");

        if(!response.success) return;

        renderHistory(

            response.data

        );

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# HIỂN THỊ LỊCH SỬ
============================================================ */

function renderHistory(data){

const history=document.getElementById(

"historyList"

);

if(!history) return;

history.innerHTML="";

if(data.length===0){

history.innerHTML=`

<div class="text-center text-gray-500 py-10">

Chưa có lịch sử nhận diện

</div>

`;

return;

}

data.forEach(item=>{

history.innerHTML+=`

<div class="bg-white rounded-xl shadow p-5 mb-4">

<div class="flex justify-between">

<div>

<h3 class="font-bold text-lg">

${item.disease}

</h3>

<p class="text-gray-500">

${item.level}

</p>

</div>

<div>

<small>

${item.created_at}

</small>

</div>

</div>

<p class="mt-3">

${item.solution}

</p>

</div>

`;

});

}

/* ============================================================
# SAU KHI AI PHÂN TÍCH XONG
============================================================ */

async function afterDetect(result){

displayResult(result);

await saveHistory(result);

await loadHistory();

}

/* ============================================================
# CẬP NHẬT detectButton
============================================================ */

if(detectButton){

detectButton.onclick=async()=>{

const file=imageInput.files[0];

if(!file){

showToast(

"Bạn chưa chọn ảnh",

"warning"

);

return;

}

const form=new FormData();

form.append(

"image",

file

);

showLoading();

const response=await fetch(

API_URL+"/api/detect",

{

method:"POST",

body:form

}

);

const result=await response.json();

hideLoading();

if(!result.success){

showToast(

"Lỗi AI",

"error"

);

return;

}

await afterDetect(result);

};

}

/* ============================================================
# TÌM KIẾM LỊCH SỬ
============================================================ */

const searchHistory=document.getElementById(

"searchHistory"

);

if(searchHistory){

searchHistory.oninput=()=>{

const keyword=searchHistory.value.toLowerCase();

const cards=document.querySelectorAll(

"#historyList > div"

);

cards.forEach(card=>{

if(

card.innerText.toLowerCase().includes(keyword)

){

card.style.display="block";

}else{

card.style.display="none";

}

});

};

}

/* ============================================================
# THỐNG KÊ
============================================================ */

async function updateStatistics(){

try{

const response=await api(

"/api/history"

);

if(!response.success) return;

const history=response.data;

document.getElementById(

"totalDetect"

).innerText=history.length;

const today=new Date().toLocaleDateString();

let todayCount=0;

history.forEach(item=>{

if(

item.created_at.includes(today)

){

todayCount++;

}

});

document.getElementById(

"todayDetect"

).innerText=todayCount;

}

catch(error){

console.log(error);

}

}

/* ============================================================
# KHỞI TẠO
============================================================ */

window.addEventListener(

"DOMContentLoaded",

async()=>{

await loadReviews();

await loadHistory();

await updateStatistics();

}
);
/* ============================================================
# PARSE KẾT QUẢ GEMINI
============================================================ */

function parseGeminiResult(text){

    try{

        const clean = text
            .replace(/```json/g,"")
            .replace(/```/g,"")
            .trim();

        return JSON.parse(clean);

    }

    catch(error){

        return{

            disease:"Không xác định",

            confidence:"--",

            level:"--",

            cause:text,

            solution:"Không có",

            medicine:"Không có",

            prevent:"Không có"

        };

    }

}

/* ============================================================
# HIỂN THỊ KẾT QUẢ AI
============================================================ */

function displayResult(response){

    const data = parseGeminiResult(response.result);

    const resultBox = document.getElementById("resultBox");

    resultBox.classList.remove("hidden");

    document.getElementById("disease").innerText=data.disease;

    document.getElementById("confidence").innerText=data.confidence;

    document.getElementById("level").innerText=data.level;

    document.getElementById("cause").innerText=data.cause;

    document.getElementById("solution").innerText=data.solution;

    document.getElementById("medicine").innerText=data.medicine;

    document.getElementById("prevent").innerText=data.prevent;

    const image=document.getElementById("resultImage");

    if(image){

        image.src=API_URL+"/uploads/"+response.image;

    }

}

/* ============================================================
# KÉO THẢ ẢNH
============================================================ */

const dropArea=document.getElementById("dropArea");

if(dropArea){

dropArea.addEventListener("dragover",(e)=>{

e.preventDefault();

dropArea.classList.add("border-green-600");

});

dropArea.addEventListener("dragleave",()=>{

dropArea.classList.remove("border-green-600");

});

dropArea.addEventListener("drop",(e)=>{

e.preventDefault();

dropArea.classList.remove("border-green-600");

const file=e.dataTransfer.files[0];

if(!file) return;

imageInput.files=e.dataTransfer.files;

previewImage.src=URL.createObjectURL(file);

previewImage.classList.remove("hidden");

});

}

/* ============================================================
# XÓA KẾT QUẢ
============================================================ */

const clearButton=document.getElementById("clearResult");

if(clearButton){

clearButton.onclick=()=>{

previewImage.src="";

previewImage.classList.add("hidden");

imageInput.value="";

document.getElementById("resultBox").classList.add("hidden");

};

}

/* ============================================================
# COPY KẾT QUẢ
============================================================ */

const copyButton=document.getElementById("copyResult");

if(copyButton){

copyButton.onclick=()=>{

const text=`

Tên bệnh:

${document.getElementById("disease").innerText}

Độ tin cậy:

${document.getElementById("confidence").innerText}

Mức độ:

${document.getElementById("level").innerText}

Nguyên nhân:

${document.getElementById("cause").innerText}

Giải pháp:

${document.getElementById("solution").innerText}

Thuốc:

${document.getElementById("medicine").innerText}

Phòng tránh:

${document.getElementById("prevent").innerText}

`;

navigator.clipboard.writeText(text);

showToast(

"Đã sao chép"

);

};

}

/* ============================================================
# TẢI LẠI DỮ LIỆU
============================================================ */

const refreshButton=document.getElementById("refreshHistory");

if(refreshButton){

refreshButton.onclick=async()=>{

await loadHistory();

await updateStatistics();

showToast(

"Đã cập nhật"

);

};

}
/* ============================================================
# XÓA TOÀN BỘ LỊCH SỬ
============================================================ */

const clearHistoryButton=document.getElementById("clearHistory");

if(clearHistoryButton){

clearHistoryButton.onclick=()=>{

Swal.fire({

title:"Xóa toàn bộ lịch sử?",

text:"Bạn sẽ không thể khôi phục.",

icon:"warning",

showCancelButton:true,

confirmButtonText:"Xóa",

cancelButtonText:"Hủy"

}).then(async(result)=>{

if(!result.isConfirmed) return;

await api(

"/api/history",

{

method:"DELETE"

}

);

await loadHistory();

await updateStatistics();

showToast(

"Đã xóa lịch sử"

);

});

};

}

/* ============================================================
# XUẤT LỊCH SỬ
============================================================ */

const exportHistory=document.getElementById("exportHistory");

if(exportHistory){

exportHistory.onclick=async()=>{

const response=await api("/api/history");

if(!response.success){

showToast(

"Không có dữ liệu",

"warning"

);

return;

}

const text=JSON.stringify(

response.data,

null,

4

);

const blob=new Blob(

[text],

{

type:"application/json"

}

);

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="history.json";

a.click();

URL.revokeObjectURL(url);

showToast(

"Đã xuất lịch sử"

);

};

}

/* ============================================================
# ĐỔI GIAO DIỆN
============================================================ */

const themeButton=document.getElementById("themeButton");

if(themeButton){

themeButton.onclick=()=>{

document.body.classList.toggle(

"dark"

);

localStorage.setItem(

"theme",

document.body.classList.contains("dark")

?"dark"

:"light"

);

};

}

window.addEventListener(

"DOMContentLoaded",

()=>{

const theme=localStorage.getItem(

"theme"

);

if(theme==="dark"){

document.body.classList.add(

"dark"

);

}

}
);

/* ============================================================
# THỐNG KÊ MỨC ĐỘ BỆNH
============================================================ */

async function updateLevelStatistics(){

const response=await api("/api/history");

if(!response.success) return;

let light=0;

let medium=0;

let heavy=0;

response.data.forEach(item=>{

switch(item.level){

case"Nhẹ":

light++;

break;

case"Trung bình":

medium++;

break;

case"Nặng":

heavy++;

break;

}

});

const lightBox=document.getElementById("lightCount");

const mediumBox=document.getElementById("mediumCount");

const heavyBox=document.getElementById("heavyCount");

if(lightBox) lightBox.innerText=light;

if(mediumBox) mediumBox.innerText=medium;

if(heavyBox) heavyBox.innerText=heavy;

}

/* ============================================================
# KHỞI TẠO TOÀN BỘ
============================================================ */

window.addEventListener(

"DOMContentLoaded",

async()=>{

await loadReviews();

await loadHistory();

await updateStatistics();

await updateLevelStatistics();

}
);
/* ============================================================
# LIKE ĐÁNH GIÁ
============================================================ */

async function likeReview(id){

    try{

        const result = await api(

            "/api/reviews/"+id+"/like",

            {

                method:"POST"

            }

        );

        if(result.success){

            await loadReviews();

        }

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# XÓA ĐÁNH GIÁ
============================================================ */

async function deleteReview(id){

    const confirm = await Swal.fire({

        title:"Xóa đánh giá?",

        text:"Bạn sẽ không thể khôi phục.",

        icon:"warning",

        showCancelButton:true,

        confirmButtonText:"Xóa",

        cancelButtonText:"Hủy"

    });

    if(!confirm.isConfirmed) return;

    try{

        const result = await api(

            "/api/reviews/"+id,

            {

                method:"DELETE"

            }

        );

        if(result.success){

            showToast(

                "Đã xóa"

            );

            await loadReviews();

        }

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# CHỈNH SỬA ĐÁNH GIÁ
============================================================ */

async function editReview(review){

    const result = await Swal.fire({

        title:"Chỉnh sửa đánh giá",

        html:`

        <input
            id="editName"
            class="swal2-input"
            value="${review.name}"
        >

        <textarea
            id="editContent"
            class="swal2-textarea"
        >${review.content}</textarea>

        `,

        focusConfirm:false,

        preConfirm(){

            return{

                name:document.getElementById(

                    "editName"

                ).value,

                content:document.getElementById(

                    "editContent"

                ).value

            };

        }

    });

    if(!result.isConfirmed) return;

    try{

        await api(

            "/api/reviews/"+review.id,

            {

                method:"PUT",

                body:JSON.stringify({

                    name:result.value.name,

                    content:result.value.content

                })

            }

        );

        showToast(

            "Đã cập nhật"

        );

        await loadReviews();

    }

    catch(error){

        console.log(error);

    }

}

/* ============================================================
# TÌM KIẾM ĐÁNH GIÁ
============================================================ */

const searchReview = document.getElementById(

    "searchReview"

);

if(searchReview){

searchReview.oninput=()=>{

const keyword=searchReview.value.toLowerCase();

document.querySelectorAll(

"#reviewList .reviewCard"

).forEach(card=>{

const text=card.innerText.toLowerCase();

card.style.display=text.includes(keyword)

?"block"

:"none";

});

};

}

/* ============================================================
# LỌC THEO SỐ SAO
============================================================ */

const filterStar=document.getElementById(

"filterStar"

);

if(filterStar){

filterStar.onchange=()=>{

const star=Number(

filterStar.value

);

document.querySelectorAll(

"#reviewList .reviewCard"

).forEach(card=>{

const value=Number(

card.dataset.star

);

if(

star===0||

value===star

){

card.style.display="block";

}

else{

card.style.display="none";

}

});

};

}

/* ============================================================
# PHÂN TRANG REVIEW
============================================================ */

let reviewPage=1;

const reviewPerPage=5;

function paginateReviews(list){

const start=(reviewPage-1)*reviewPerPage;

const end=start+reviewPerPage;

return list.slice(start,end);

}

/* ============================================================
# HIỂN THỊ PHÂN TRANG
============================================================ */

function renderPagination(total){

const pageBox=document.getElementById(

"reviewPagination"

);

if(!pageBox) return;

pageBox.innerHTML="";

const pages=Math.ceil(

total/reviewPerPage

);

for(let i=1;i<=pages;i++){

pageBox.innerHTML+=`

<button

class="px-3 py-2 border rounded-lg mx-1"

onclick="changeReviewPage(${i})"

>

${i}

</button>

`;

}

}

function changeReviewPage(page){

reviewPage=page;

renderReviews();

}

/* ============================================================
# KẾT THÚC APP.JS
============================================================ */

console.log(

"🌿 AgroCare AI Ready"

);

/* ============================================
   XUẤT DỮ LIỆU EXCEL
============================================ */

const exportExcelButton = document.getElementById("exportExcel");

if (exportExcelButton) {

    exportExcelButton.addEventListener("click", async () => {

        try {

            exportExcelButton.disabled = true;

            exportExcelButton.innerText = "Đang xuất Excel...";

            const response = await fetch(
                "/api/history/export-excel"
            );

            if (!response.ok) {
                throw new Error("Không thể xuất dữ liệu Excel");
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download = "AgroCare_AI_Thong_Ke.xlsx";

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);

            if (typeof showToast === "function") {
                showToast("Xuất Excel thành công!");
            } else {
                alert("Xuất Excel thành công!");
            }

        } catch (error) {

            console.error(error);

            alert("Có lỗi khi xuất Excel: " + error.message);

        } finally {

            exportExcelButton.disabled = false;

            exportExcelButton.innerHTML =
                '<i class="fa-solid fa-file-excel"></i> Xuất Excel';

        }

    });

}
