// === 1. ПІДКЛЮЧЕННЯ FIREBASE (❗ ТВІЙ COLLEGE-31243 ❗) ===
const firebaseConfig = {
    apiKey: "ВСТАВ_ТВІЙ_API_KEY_СЮДИ",
    authDomain: "college-31243.firebaseapp.com",
    databaseURL: "https://college-31243-default-rtdb.firebaseio.com",
    projectId: "college-31243",
    storageBucket: "college-31243.firebasestorage.app",
    messagingSenderId: "ВСТАВ_ТВІЙ_SENDER_ID_СЮДИ",
    appId: "ВСТАВ_ТВІЙ_APP_ID_СЮДИ",
    measurementId: "ВСТАВ_ТВІЙ_MEASUREMENT_ID_СЮДИ"
};

// Ініціалізуємо Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const studentsRef = db.ref('students'); // Список групи
const attendanceRef = db.ref('attendance'); // Журнал відвідувань

// === НАЛАШТУВАННЯ ===
const SECRET_CODE = "2007"; // Код старости

// === ЕЛЕМЕНТИ ІНТЕРФЕЙСУ ===
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const studentsList = document.getElementById("students-list");
const dateInput = document.getElementById("lesson-date");
const subjectInput = document.getElementById("lesson-subject");
const secretCodeInput = document.getElementById("secret-code");

// Встановлюємо сьогоднішню дату за замовчуванням
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;

// === 2. ЛОГІКА ВХОДУ ===
document.getElementById("login-btn").addEventListener("click", () => {
    if (secretCodeInput.value === SECRET_CODE) {
        loginScreen.style.display = "none";
        appScreen.style.display = "block";
    } else {
        document.getElementById("error-msg").style.display = "block";
        secretCodeInput.value = ""; // Очищаємо код при помилці
    }
});

// Додаємо можливість входити по натисканню Enter
secretCodeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") document.getElementById("login-btn").click();
});

// === 3. ЗАВАНТАЖЕННЯ СПИСКУ ТА СИНХРОНІЗАЦІЯ З БАЗОЮ ===
let currentStudents = [];

function loadTable() {
    const selectedDate = dateInput.value;
    const selectedSubject = subjectInput.value.trim() || "Без назви"; // Якщо пусте, назвемо "Без назви"

    if (!selectedDate) return; // Якщо дати немає, нічого не робимо

    // Слухаємо зміни у списку студентів (щоразу, як хтось додає/видаляє)
    studentsRef.on('value', (studentSnap) => {
        const studentData = studentSnap.val();
        currentStudents = [];
        if (studentData) {
            for (let id in studentData) {
                currentStudents.push({ id: id, name: studentData[id].name });
            }
        }
        
        // 🔥 СОРТУВАННЯ ЗА УКРАЇНСЬКИМ АЛФАВІТОМ 🔥
        currentStudents.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

        // Тепер беремо галочки саме для цієї дати і цієї пари
        attendanceRef.child(selectedDate).child(selectedSubject).on('value', (attSnap) => {
            const attendanceData = attSnap.val() || {};
            renderTable(attendanceData);
        });
    });
}

// Функція малювання таблиці на екрані
function renderTable(attendanceData) {
    studentsList.innerHTML = "";
    
    if (currentStudents.length === 0) {
        studentsList.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #9da8bb; padding: 40px;">Група поки порожня. Додайте першого студента вгорі!</td></tr>`;
        return;
    }

    currentStudents.forEach(student => {
        const tr = document.createElement("tr");
        
        // Перевіряємо, чи є відмітка про відсутність у базі
        const isAbsent = attendanceData[student.id] ? "checked" : "";

        tr.innerHTML = `
            <td class="col-name">${student.name}</td>
            <td class="col-absent"><input type="checkbox" class="attendance-check" data-id="${student.id}" ${isAbsent}></td>
            <td class="col-actions"><button class="delete-btn" data-id="${student.id}">&times; Видалити</button></td>
        `;
        studentsList.appendChild(tr);
    });
}

// Оновлюємо таблицю, коли міняємо дату або назву пари
dateInput.addEventListener("change", loadTable);
subjectInput.addEventListener("input", loadTable);
loadTable(); // Перший запуск при завантаженні сторінки

// === 4. ЗБЕРЕЖЕННЯ ВІДМІТОК У БАЗУ (ВІДСУТНІХ) ===
studentsList.addEventListener("change", function(event) {
    if (event.target.classList.contains("attendance-check")) {
        const studentId = event.target.getAttribute("data-id");
        const isAbsentNow = event.target.checked;
        const selectedDate = dateInput.value;
        const selectedSubject = subjectInput.value.trim() || "Без назви";

        if (!selectedDate) {
            alert("Спочатку оберіть дату заняття!");
            event.target.checked = !isAbsentNow; // Повертаємо галочку назад
            return;
        }

        // Записуємо в базу: Дата -> Пара -> Айді студента -> Відсутній (true/false)
        attendanceRef.child(selectedDate).child(selectedSubject).child(studentId).set(isAbsentNow);
    }
});

// === 5. ДОДАВАННЯ ТА ВИДАЛЕННЯ СТУДЕНТІВ З ГРУПИ ===
document.getElementById("add-student-btn").addEventListener("click", () => {
    const nameInput = document.getElementById("new-student-name");
    const name = nameInput.value.trim();
    if (name !== "") {
        studentsRef.push({ name: name }); // Відправляємо в базу
        nameInput.value = "";
        nameInput.focus();
    } else {
        alert("Введіть ім'я та прізвище!");
    }
});

// Додаємо студента поEnter
document.getElementById("new-student-name").addEventListener("keypress", (event) => {
    if (event.key === "Enter") document.getElementById("add-student-btn").click();
});

studentsList.addEventListener("click", function(event) {
    if (event.target.classList.contains("delete-btn")) {
        if(confirm(`Точно видалити студента з групи? (Його статистика збережеться у попередніх записах відвідування, але він зникне з таблиці)`)) {
            const studentId = event.target.getAttribute("data-id");
            studentsRef.child(studentId).remove(); // Видаляємо з бази
        }
    }
});

// === 6. КОПІЮВАННЯ СПИСКУ ВІДСУТНІХ У БУФЕР ОБМІНУ ===
document.getElementById("copy-absent-btn").addEventListener("click", () => {
    const selectedDate = dateInput.value;
    const selectedSubject = subjectInput.value.trim() || "Пара";
    let absentList = `Відсутні на парі (${selectedSubject}, ${selectedDate}):\n`;
    let count = 1;

    document.querySelectorAll(".attendance-check").forEach(checkbox => {
        if (checkbox.checked) {
            const name = checkbox.closest("tr").cells[0].innerText;
            absentList += `${count}. ${name}\n`;
            count++;
        }
    });

    if (count === 1) absentList = `Сьогодні (${selectedSubject}, ${selectedDate}) всі присутні! 🎉`;

    navigator.clipboard.writeText(absentList);
    alert("Список відсутніх скопійовано у буфер обміну!");
});

// === 7. ЛОГІКА СТАТИСТИКИ (МОДАЛЬНЕ ВІКНО) ===
const statsModal = document.getElementById("stats-modal");

document.getElementById("show-stats-btn").addEventListener("click", () => {
    statsModal.style.display = "flex";
    // Ставимо діапазон "сьогодні - сьогодні" для старту
    document.getElementById("stat-start-date").value = today;
    document.getElementById("stat-end-date").value = today;
    document.getElementById("stats-result-list").innerHTML = "<li>Оберіть діапазон дат і натисніть \"Показати\"</li>";
});

document.getElementById("close-stats-btn").addEventListener("click", () => {
    statsModal.style.display = "none";
});

// Закриття модального вікна при кліку на фон
window.addEventListener("click", (event) => {
    if (event.target === statsModal) statsModal.style.display = "none";
});

// Підрахунок статистики
document.getElementById("calc-stats-btn").addEventListener("click", () => {
    const startDate = document.getElementById("stat-start-date").value;
    const endDate = document.getElementById("stat-end-date").value;
    
    if(!startDate || !endDate) return alert("Оберіть обидві дати!");

    // Завантажуємо всю базу відвідувань один раз
    attendanceRef.once('value').then(snap => {
        const data = snap.val();
        let absenceCount = {}; // Об'єкт для підрахунку пропусків

        if (!data) {
            document.getElementById("stats-result-list").innerHTML = "<li>У базі поки немає відміток!</li>";
            return;
        }

        // Пробігаємось по датах у базі
        for (let date in data) {
            // Перевіряємо, чи дата входить у вибраний діапазон
            if (date >= startDate && date <= endDate) {
                const subjects = data[date];
                for (let subject in subjects) {
                    const students = subjects[subject];
                    for (let studentId in students) {
                        if (students[studentId] === true) { // Якщо студент був відмічений як відсутній
                            absenceCount[studentId] = (absenceCount[studentId] || 0) + 1;
                        }
                    }
                }
            }
        }

        // Виводимо результат
        const statsList = document.getElementById("stats-result-list");
        statsList.innerHTML = "";
        
        // Збираємо масив студентів, у яких є пропуски
        let resultStudents = [];
        currentStudents.forEach(student => {
            if (absenceCount[student.id]) {
                resultStudents.push({ name: student.name, count: absenceCount[student.id] });
            }
        });

        // Сортуємо результат за кількістю пропусків (від більшого до меншого)
        resultStudents.sort((a, b) => b.count - a.count);

        if (resultStudents.length === 0) {
            statsList.innerHTML = "<li>🎉 У вибраний період пропусків немає!</li>";
        } else {
            resultStudents.forEach(item => {
                const li = document.createElement("li");
                li.innerHTML = `<span>${item.name}</span> <span class="count">${item.count}</span>`;
                statsList.appendChild(li);
            });
        }
    });
});

// === 8. АВТОЗАПОВНЕННЯ НАЗВ ПАР ===
function syncSubjectsList() {
    const datalist = document.getElementById('subjects-list-data');
    if (!datalist) return; 
    
    // Твій стандартний список предметів
    const defaultSubjects = [
        "Інж. програмне забесп.", 
        "Програмування", 
        "Пер. пристрої", 
        "ОФЗ", 
        "БЖД", 
        "Фізичне виховання", 
        "Захист інформації", 
        "Архітектура", 
        "Комп'ютерна схемотехніка", 
        "Іноземна мова", 
        "Web-технології"
    ];

    // Слухаємо базу відвідувань, щоб знайти всі назви пар
    attendanceRef.on('value', (snap) => {
        const data = snap.val();
        
        // Створюємо список, одразу закидаючи туди твої стандартні предмети
        const uniqueSubjects = new Set(defaultSubjects);
        
        if (data) {
            // Проходимо по базі: якщо ви вводили якісь НОВІ предмети, вони теж додадуться
            Object.values(data).forEach(day => {
                Object.keys(day).forEach(subjectName => {
                    if (subjectName !== "Без назви") {
                        uniqueSubjects.add(subjectName);
                    }
                });
            });
        }

        // Очищаємо список в HTML і додаємо всі опції (вони будуть відсортовані за алфавітом)
        datalist.innerHTML = "";
        Array.from(uniqueSubjects).sort().forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            datalist.appendChild(option);
        });
    });
}

// Запускаємо функцію синхронізації списку пар
syncSubjectsList();
