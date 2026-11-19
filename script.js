/* ==========================================
   LANDSLIDE MONITOR SYSTEM - VERSION 2.0
   ========================================== */

const $ = (id) => document.getElementById(id);

/* ---------- CẤU HÌNH ---------- */

let settings = {
    simulation: true,
    moistureThreshold: 75,
    vibrationThreshold: 65,
    sound: true
};

let data = {
    moisture: 42,
    vibration: 12,
    temperature: 24,
    status: "safe"
};

let historyData = [];
let moistureHistory = [];
let vibrationHistory = [];

let lastStatus = "";
let lastAlertTime = "";
let simulationInterval = null;
let toastTimeout = null;

const MAX_POINTS = 30;

/* ---------- LƯU CÀI ĐẶT ---------- */

function loadSettings() {
    try {
        const saved = localStorage.getItem("landslide_settings");

        if (saved) {
            settings = {
                ...settings,
                ...JSON.parse(saved)
            };
        }
    } catch (error) {
        console.log("Không thể đọc cài đặt.");
    }

    $("simulationToggle").checked = settings.simulation;
    $("moistureThreshold").value = settings.moistureThreshold;
    $("vibrationThreshold").value = settings.vibrationThreshold;
    $("soundToggle").checked = settings.sound;
}

function saveSettings() {
    settings.simulation = $("simulationToggle").checked;

    settings.moistureThreshold =
        Number($("moistureThreshold").value);

    settings.vibrationThreshold =
        Number($("vibrationThreshold").value);

    settings.sound = $("soundToggle").checked;

    if (
        settings.moistureThreshold < 1 ||
        settings.moistureThreshold > 100 ||
        settings.vibrationThreshold < 1 ||
        settings.vibrationThreshold > 100
    ) {
        showToast("⚠️", "Ngưỡng phải nằm trong khoảng 1–100.");
        return;
    }

    try {
        localStorage.setItem(
            "landslide_settings",
            JSON.stringify(settings)
        );
    } catch (error) {
        console.log("Không thể lưu cài đặt.");
    }

    updateMode();
    evaluateStatus();
    showToast("✅", "Đã lưu cài đặt thành công.");
}

function resetSettings() {
    settings = {
        simulation: true,
        moistureThreshold: 75,
        vibrationThreshold: 65,
        sound: true
    };

    loadSettings();

    try {
        localStorage.setItem(
            "landslide_settings",
            JSON.stringify(settings)
        );
    } catch (error) {}

    updateMode();
    evaluateStatus();

    showToast("🔄", "Đã khôi phục cài đặt mặc định.");
}

/* ---------- ĐIỀU HƯỚNG ---------- */

const pageNames = {
    overview: "TỔNG QUAN",
    monitor: "GIÁM SÁT",
    history: "LỊCH SỬ",
    guide: "HƯỚNG DẪN",
    settings: "CÀI ĐẶT"
};

const pageTitles = {
    overview: "Tổng quan hệ thống",
    monitor: "Giám sát dữ liệu",
    history: "Lịch sử cảnh báo",
    guide: "Hướng dẫn ứng phó",
    settings: "Cài đặt hệ thống"
};

function openPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    const selectedPage = $(page);

    if (!selectedPage) return;

    selectedPage.classList.add("active");

    const selectedButton = document.querySelector(
        `.nav-btn[data-page="${page}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    $("pageName").textContent = pageNames[page] || "";
    $("pageTitle").textContent = pageTitles[page] || "";

    setTimeout(() => {
        drawCharts();
    }, 100);
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-open-page]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.openPage);
    });
});

/* ---------- THỜI GIAN ---------- */

function updateClock() {
    const now = new Date();

    $("clock").textContent = now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

setInterval(updateClock, 1000);
updateClock();

/* ---------- THÔNG BÁO ---------- */

function showToast(icon, message) {
    $("toastIcon").textContent = icon;
    $("toastMessage").textContent = message;

    $("toast").classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        $("toast").classList.remove("show");
    }, 3500);
}

/* ---------- ÂM THANH ---------- */

function playAlertSound() {
    if (!settings.sound) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.value = 880;

        gain.gain.setValueAtTime(
            0.15,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.5
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);

    } catch (error) {
        console.log("Không thể phát âm thanh.");
    }
}

$("soundBtn").addEventListener("click", () => {
    settings.sound = !settings.sound;

    $("soundToggle").checked = settings.sound;

    $("soundBtn").textContent = settings.sound ? "🔔" : "🔕";

    try {
        localStorage.setItem(
            "landslide_settings",
            JSON.stringify(settings)
        );
    } catch (error) {}

    showToast(
        settings.sound ? "🔔" : "🔕",
        settings.sound ? "Đã bật âm thanh." : "Đã tắt âm thanh."
    );
});

/* ---------- TRẠNG THÁI ---------- */

function evaluateStatus() {
    const moisture = data.moisture;
    const vibration = data.vibration;

    const moistureDanger =
        settings.moistureThreshold + 10;

    const vibrationDanger =
        settings.vibrationThreshold + 15;

    if (
        moisture >= moistureDanger ||
        vibration >= vibrationDanger
    ) {
        data.status = "danger";
    } else if (
        moisture >= settings.moistureThreshold ||
        vibration >= settings.vibrationThreshold
    ) {
        data.status = "warning";
    } else {
        data.status = "safe";
    }

    updateDashboard();

    if (data.status !== lastStatus) {
        recordEvent();

        if (lastStatus !== "") {
            if (data.status === "warning") {
                showToast(
                    "⚠️",
                    "Phát hiện thông số vượt ngưỡng cảnh báo!"
                );
                playAlertSound();
            }

            if (data.status === "danger") {
                showToast(
                    "🚨",
                    "CẢNH BÁO NGUY HIỂM! Hãy chú ý an toàn."
                );
                playAlertSound();
            }

            if (
                data.status === "safe" &&
                lastStatus !== "safe"
            ) {
                showToast(
                    "✅",
                    "Thông số đã trở về mức bình thường."
                );
            }
        }

        lastStatus = data.status;
    }
}

/* ---------- CẬP NHẬT GIAO DIỆN ---------- */

function updateDashboard() {
    $("moistureValue").textContent =
        data.moisture.toFixed(1);

    $("vibrationValue").textContent =
        data.vibration.toFixed(0);

    $("temperatureValue").textContent =
        data.temperature.toFixed(1);

    $("moistureBar").style.width =
        Math.min(data.moisture, 100) + "%";

    $("vibrationBar").style.width =
        Math.min(data.vibration, 100) + "%";

    $("monitorMoisture").textContent =
        data.moisture.toFixed(1);

    $("monitorVibration").textContent =
        data.vibration.toFixed(0);

    updateSensorStatus();
    updateAlertBanner();
    updateQuickGuide();
    updateMode();
    drawCharts();
}

function updateAlertBanner() {
    const banner = $("alertBanner");

    banner.classList.remove("safe", "warning", "danger");

    banner.classList.add(data.status);

    if (data.status === "safe") {
        $("alertSymbol").textContent = "✓";

        $("alertTitle").textContent =
            "HỆ THỐNG ĐANG AN TOÀN";

        $("alertDescription").textContent =
            "Các thông số hiện tại chưa vượt ngưỡng mô phỏng.";
    }

    if (data.status === "warning") {
        $("alertSymbol").textContent = "⚠";

        $("alertTitle").textContent =
            "CẢNH BÁO - CẦN THEO DÕI";

        $("alertDescription").textContent =
            "Một hoặc nhiều thông số đã vượt ngưỡng cảnh báo mô phỏng.";
    }

    if (data.status === "danger") {
        $("alertSymbol").textContent = "🚨";

        $("alertTitle").textContent =
            "CẢNH BÁO NGUY HIỂM";

        $("alertDescription").textContent =
            "Thông số mô phỏng ở mức cao. Hãy kiểm tra dữ liệu và ưu tiên an toàn.";
    }

    $("alertTime").textContent =
        "Cập nhật: " + new Date().toLocaleTimeString("vi-VN");
}

function updateSensorStatus() {
    $("moistureStatus").textContent =
        getMoistureText(data.moisture);

    $("vibrationStatus").textContent =
        getVibrationText(data.vibration);
}

function getMoistureText(value) {
    if (value >= settings.moistureThreshold + 10) {
        return "Mức cao";
    }

    if (value >= settings.moistureThreshold) {
        return "Cần theo dõi";
    }

    return "Trong ngưỡng mô phỏng";
}

function getVibrationText(value) {
    if (value >= settings.vibrationThreshold + 15) {
        return "Rung động cao";
    }

    if (value >= settings.vibrationThreshold) {
        return "Bất thường";
    }

    return "Ổn định";
}

function updateQuickGuide() {
    const guide = $("quickGuide");
    const title = $("quickGuideTitle");

    if (data.status === "safe") {
        title.textContent = "Khuyến nghị an toàn";

        guide.innerHTML = `
            <p>• Theo dõi tình hình thời tiết và thông báo từ cơ quan chức năng.</p>
            <p>• Kiểm tra hệ thống cảnh báo thường xuyên.</p>
            <p>• Chuẩn bị phương án di chuyển đến nơi an toàn khi cần thiết.</p>
        `;
    }

    if (data.status === "warning") {
        title.textContent = "Khuyến nghị khi có cảnh báo";

        guide.innerHTML = `
            <p>• Thông báo cho người lớn và những người ở gần.</p>
            <p>• Hạn chế đến gần khu vực sườn dốc có nguy cơ.</p>
            <p>• Theo dõi thời tiết và thông tin từ cơ quan chức năng.</p>
            <p>• Chuẩn bị sẵn phương án đến nơi an toàn.</p>
        `;
    }

    if (data.status === "danger") {
        title.textContent = "Ưu tiên an toàn";

        guide.innerHTML = `
            <p>• Không tiếp cận khu vực nguy hiểm để kiểm tra thiết bị.</p>
            <p>• Di chuyển đến nơi an toàn khi có chỉ dẫn hoặc dấu hiệu nguy hiểm.</p>
            <p>• Thông báo người lớn, chính quyền hoặc lực lượng cứu hộ.</p>
            <p>• Không quay lại khu vực nguy hiểm khi chưa được phép.</p>
        `;
    }
}

function updateMode() {
    if (settings.simulation) {
        $("modeBadge").textContent = "● MÔ PHỎNG";
        $("connectionValue").textContent = "Mô phỏng";
        $("connectionStatus").textContent = "Dữ liệu giả lập";
        $("sidebarStatus").textContent = "Đang mô phỏng";
    } else {
        $("modeBadge").textContent = "● CHỜ KẾT NỐI";
        $("connectionValue").textContent = "Chưa kết nối";
        $("connectionStatus").textContent =
            "Chưa nhận dữ liệu Arduino";
        $("sidebarStatus").textContent =
            "Chờ kết nối thiết bị";
    }
}

/* ---------- MÔ PHỎNG ---------- */

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function simulateData() {
    if (!settings.simulation) return;

    // Thay đổi nhẹ các thông số theo từng lần cập nhật
    data.moisture += randomBetween(-2.5, 2.5);
    data.vibration += randomBetween(-5, 5);
    data.temperature += randomBetween(-0.3, 0.3);

    data.moisture = Math.max(
        10,
        Math.min(100, data.moisture)
    );

    data.vibration = Math.max(
        0,
        Math.min(100, data.vibration)
    );

    data.temperature = Math.max(
        15,
        Math.min(38, data.temperature)
    );

    // Ghi dữ liệu vào biểu đồ
    moistureHistory.push(data.moisture);
    vibrationHistory.push(data.vibration);

    if (moistureHistory.length > MAX_POINTS) {
        moistureHistory.shift();
    }

    if (vibrationHistory.length > MAX_POINTS) {
        vibrationHistory.shift();
    }

    evaluateStatus();
}

function startSimulation() {
    clearInterval(simulationInterval);

    if (settings.simulation) {
        simulationInterval = setInterval(
            simulateData,
            2000
        );
    }
}

/* ---------- BIỂU ĐỒ ---------- */

function drawChart(canvasId, values, label, color) {
    const canvas = $(canvasId);

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const padding = {
        top: 20,
        bottom: 30,
        left: 38,
        right: 12
    };

    const chartWidth =
        width - padding.left - padding.right;

    const chartHeight =
        height - padding.top - padding.bottom;

    // Nền
    ctx.clearRect(0, 0, width, height);

    // Đường lưới
    ctx.strokeStyle = "#edf1f4";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y =
            padding.top + chartHeight * (i / 4);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#94a3af";
        ctx.font = "10px Arial";
        ctx.textAlign = "right";

        ctx.fillText(
            Math.round(100 - i * 25),
            padding.left - 8,
            y + 3
        );
    }

    if (values.length < 2) {
        ctx.fillStyle = "#94a3af";
        ctx.textAlign = "center";
        ctx.font = "12px Arial";

        ctx.fillText(
            "Đang chờ dữ liệu...",
            width / 2,
            height / 2
        );

        return;
    }

    // Đường biểu đồ
    ctx.beginPath();

    values.forEach((value, index) => {
        const x =
            padding.left +
            (index / (values.length - 1)) * chartWidth;

        const y =
            padding.top +
            chartHeight -
            (value / 100) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Vùng bên dưới
    const lastX = width - padding.right;

    ctx.lineTo(
        lastX,
        padding.top + chartHeight
    );

    ctx.lineTo(
        padding.left,
        padding.top + chartHeight
    );

    ctx.closePath();

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Điểm cuối
    const lastValue = values[values.length - 1];

    const lastY =
        padding.top +
        chartHeight -
        (lastValue / 100) * chartHeight;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";

    ctx.fillText(
        lastValue.toFixed(1),
        Math.max(padding.left, lastX - 32),
        Math.max(12, lastY - 10)
    );

    // Trục thời gian
    ctx.fillStyle = "#94a3af";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";

    ctx.fillText("Đầu", padding.left, height - 8);
    ctx.fillText("Hiện tại", lastX, height - 8);
}

function drawCharts() {
    const selected = $("chartSelect").value;

    if (selected === "moisture") {
        drawChart(
            "chartCanvas",
            moistureHistory,
            "Độ ẩm",
            "#4299e1"
        );

        $("chartLegend").textContent = "Độ ẩm đất (%)";
    } else {
        drawChart(
            "chartCanvas",
            vibrationHistory,
            "Rung động",
            "#f39c43"
        );

        $("chartLegend").textContent = "Rung động (/100)";
    }

    drawChart(
        "monitorCanvas",
        moistureHistory,
        "Độ ẩm",
        "#16a085"
    );

    $("chartUpdate").textContent =
        "Cập nhật " + new Date().toLocaleTimeString("vi-VN");
}

$("chartSelect").addEventListener("change", drawCharts);

/* ---------- LỊCH SỬ ---------- */

function recordEvent() {
    const time = new Date();

    const entry = {
        time: time.toLocaleString("vi-VN"),
        status: data.status,
        moisture: data.moisture.toFixed(1),
        vibration: data.vibration.toFixed(0),
        message: getStatusMessage(data.status)
    };

    historyData.unshift(entry);

    if (historyData.length > 100) {
        historyData.pop();
    }

    lastAlertTime = time.toLocaleTimeString("vi-VN");

    renderHistory();
}

function getStatusMessage(status) {
    if (status === "safe") {
        return "Thông số trong ngưỡng mô phỏng";
    }

    if (status === "warning") {
        return "Thông số vượt ngưỡng theo dõi";
    }

    return "Thông số vượt ngưỡng nguy hiểm mô phỏng";
}

function renderHistory() {
    const tbody = $("historyTable");

    tbody.innerHTML = "";

    $("historyCount").textContent = historyData.length;

    $("lastAlert").textContent =
        historyData.length > 0
            ? historyData[0].time
            : "Chưa có";

    $("emptyHistory").style.display =
        historyData.length === 0
            ? "block"
            : "none";

    historyData.forEach(item => {
        const row = document.createElement("tr");

        let statusClass = "status-safe";

        if (item.status === "warning") {
            statusClass = "status-warning";
        }

        if (item.status === "danger") {
            statusClass = "status-danger";
        }

        row.innerHTML = `
            <td>${item.time}</td>
            <td>
                <span class="status-pill ${statusClass}">
                    ${getStatusName(item.status)}
                </span>
            </td>
            <td>${item.moisture}%</td>
            <td>${item.vibration}</td>
            <td>${item.message}</td>
        `;

        tbody.appendChild(row);
    });
}

function getStatusName(status) {
    if (status === "safe") return "An toàn";
    if (status === "warning") return "Cảnh báo";
    return "Nguy hiểm";
}

$("clearHistory").addEventListener("click", () => {
    if (historyData.length === 0) {
        showToast("ℹ️", "Lịch sử hiện đang trống.");
        return;
    }

    const confirmClear = confirm(
        "Em có chắc muốn xóa toàn bộ lịch sử không?"
    );

    if (confirmClear) {
        historyData = [];
        renderHistory();

        showToast("🗑️", "Đã xóa lịch sử.");
    }
});

/* ---------- KIỂM TRA HỆ THỐNG ---------- */

$("testBtn").addEventListener("click", () => {
    showToast("🔧", "Đang kiểm tra hệ thống...");

    setTimeout(() => {
        $("sensorMoisture").textContent = "Hoạt động";
        $("sensorVibration").textContent = "Hoạt động";
        $("sensorArduino").textContent = "Hoạt động";

        showToast(
            "✅",
            "Kiểm tra mô phỏng hoàn tất. Các thành phần hiển thị bình thường."
        );
    }, 1200);
});

/* ---------- CÀI ĐẶT ---------- */

$("saveSettings").addEventListener("click", saveSettings);

$("resetSettings").addEventListener("click", resetSettings);

$("simulationToggle").addEventListener("change", () => {
    settings.simulation = $("simulationToggle").checked;

    updateMode();

    startSimulation();

    if (!settings.simulation) {
        showToast(
            "📡",
            "Đã tắt mô phỏng. Website đang chờ kết nối dữ liệu thật."
        );
    } else {
        showToast(
            "▶",
            "Đã bật chế độ mô phỏng."
        );
    }
});

/* ---------- KHỞI ĐỘNG ---------- */

function initialize() {
    loadSettings();

    updateMode();

    // Dữ liệu ban đầu
    data.moisture = 42;
    data.vibration = 12;
    data.temperature = 24;

    // Tạo dữ liệu ban đầu cho biểu đồ
    for (let i = 0; i < 12; i++) {
        moistureHistory.push(
            40 + randomBetween(-5, 5)
        );

        vibrationHistory.push(
            12 + randomBetween(-5, 5)
        );
    }

    evaluateStatus();

    renderHistory();

    drawCharts();

    startSimulation();

    showToast(
        "🌍",
        "Website giám sát sạt lở đã khởi động."
    );
}

initialize();

/* ---------- RESPONSIVE CHART ---------- */

window.addEventListener("resize", () => {
    drawCharts();
});