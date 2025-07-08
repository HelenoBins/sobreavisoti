const supportTeam = [
    { name: "YURI", phone: "(27) 99788-7149" },
    { name: "GABRIEL", phone: "(27) 99531-2621" }
];

let currentDate = new Date();
const today = new Date();
const scheduleStartReference = new Date(2025, 5, 30); // 30/06/2025 (YURI como referência)
let isAdmin = false;
let currentWeekToSwap = null;

// 'modifiedSchedule' agora será preenchido pelo Firebase
let modifiedSchedule = []; 

// =====================================================================
// INÍCIO: Configuração e Inicialização do Firebase
// =====================================================================

// Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD_WCF2bY0wZgnMCJO8lE-zdKqYWIMw9Ik",
    authDomain: "escala-plantonistas-app.firebaseapp.com",
    projectId: "escala-plantonistas-app",
    storageBucket: "escala-plantonistas-app.firebasestorage.app",
    messagingSenderId: "176171475789",
    appId: "1:176171475789:web:cd836ece7b9019e1d20d04",
    measurementId: "G-PXE84LFLJS",
    databaseURL: "https://escala-plantonistas-app-default-rtdb.firebaseio.com" 
};

// Inicialize o Firebase usando a versão compat (que você carregou no HTML)
const app = firebase.initializeApp(firebaseConfig);

// Obtenha uma referência para o Realtime Database
const database = firebase.database();
const modifiedScheduleRef = database.ref('modifiedSchedule');

// Função para SALVAR as trocas no Firebase
function saveModifiedScheduleToFirebase(scheduleData) {
    const dataToSave = scheduleData.map(item => ({
        ...item,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString()
    }));

    modifiedScheduleRef.set(dataToSave)
        .then(() => {
            console.log("Escala modificada salva no Firebase com sucesso!");
        })
        .catch((error) => {
            console.error("Erro ao salvar a escala modificada no Firebase:", error);
            alert("Erro ao salvar a troca. Tente novamente.");
        });
}

// =====================================================================
// FIM: Configuração e Inicialização do Firebase
// =====================================================================


// Funções auxiliares (Mantenha as suas funções auxiliares aqui)
function getDiffWeeks(date1, date2) {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
}

function countDaysInMonth(startDate, endDate, targetMonth, targetYear) {
    let count = 0;
    const tempDate = new Date(startDate);
    
    while (tempDate <= endDate) {
        if (tempDate.getMonth() === targetMonth && tempDate.getFullYear() === targetYear) {
            count++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    return count;
}

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
}

// =====================================================================
// NOVA FUNÇÃO AUXILIAR: Determina o mês dominante em uma semana
// =====================================================================
function getDominantMonthForWeek(weekStart, weekEnd) {
    const counts = {}; // Armazena a contagem de dias por 'ano-mes'
    let tempDate = new Date(weekStart);

    while (tempDate <= weekEnd) {
        const yearMonthKey = `${tempDate.getFullYear()}-${tempDate.getMonth()}`;
        counts[yearMonthKey] = (counts[yearMonthKey] || 0) + 1;
        tempDate.setDate(tempDate.getDate() + 1);
    }

    let dominantMonthYear = null;
    let maxDays = 0;

    for (const key in counts) {
        if (counts[key] > maxDays) {
            maxDays = counts[key];
            dominantMonthYear = key;
        }
    }

    if (dominantMonthYear) {
        const [year, month] = dominantMonthYear.split('-').map(Number);
        return { year, month, days: maxDays };
    }
    return null; 
}
// =====================================================================


// Geração da escala com persistência de trocas (MODIFICADA)
function generateSchedule(year, month) {
    const schedule = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let currentWeekStart = new Date(firstDayOfMonth);
    // Ajusta para a segunda-feira da semana que contém o dia 1 do mês
    while (currentWeekStart.getDay() !== 1) {
        currentWeekStart.setDate(currentWeekStart.getDate() - 1);
    }

    let weekCounter = 1;
    // Loop para cobrir todas as semanas que podem pertencer ao mês atual
    // Ele vai até o final da semana que contém o último dia do mês,
    // ou até 6 semanas após o início, o que for mais abrangente.
    let loopEnd = new Date(lastDayOfMonth);
    loopEnd.setDate(loopEnd.getDate() + (7 - loopEnd.getDay() + 1)); // Vai para a próxima segunda-feira após o fim do mês
    
    // Para garantir que pegamos as semanas do início do próximo mês que começam no final do mês atual
    let iterationLimit = new Date(year, month, 1);
    iterationLimit.setDate(iterationLimit.getDate() + 6 * 7); // 6 semanas para garantir cobertura total de qualquer mês

    while (currentWeekStart <= iterationLimit) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // =====================================================================
        // MODIFICAÇÃO: Usar a função getDominantMonthForWeek
        // =====================================================================
        const dominantInfo = getDominantMonthForWeek(currentWeekStart, weekEnd);
        
        // Inclui a semana apenas se o mês alvo (year, month) for o mês dominante da semana
        if (dominantInfo && dominantInfo.year === year && dominantInfo.month === month) {
            const weeksSinceReference = getDiffWeeks(scheduleStartReference, currentWeekStart);
            let supportPerson = supportTeam[weeksSinceReference % supportTeam.length];
            
            // Verifica se há modificação para esta semana
            const modifiedWeek = modifiedSchedule.find(w => {
                return w.startDate && new Date(w.startDate).getTime() === currentWeekStart.getTime();
            });
            
            if (modifiedWeek) {
                supportPerson = supportTeam.find(m => m.name === modifiedWeek.support) || supportPerson;
            }

            schedule.push({
                weekNum: `${weekCounter}ª SEMANA`,
                period: `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`,
                support: supportPerson.name,
                phone: supportPerson.phone,
                startDate: new Date(currentWeekStart), 
                endDate: new Date(weekEnd)
            });
            weekCounter++;
        }
        // =====================================================================

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    return schedule;
}

// Renderização (Com uma pequena correção para contactsTableBody)
function renderSchedule(year, month) {
    const scheduleData = generateSchedule(year, month);
    const tableBody = document.getElementById('scheduleTableBody');
    const contactsBody = document.getElementById('contactsTableBody');
    
    tableBody.innerHTML = '';
    contactsBody.innerHTML = '';
    
    let todayOnCall = null;
    let firstDayOnCall = null;
    
    // Preenche a escala
    scheduleData.forEach(week => {
        const row = tableBody.insertRow();
        
        if (today >= week.startDate && today <= week.endDate) {
            row.classList.add('current-oncall-highlight');
            todayOnCall = week;
        }
        
        // Encontra a primeira semana visível para exibir informações do primeiro sobreaviso
        // Modificado para pegar a primeira semana gerada para o mês, independentemente de conter o dia 1
        if (!firstDayOnCall) { 
            firstDayOnCall = week;
        }
        
        row.insertCell().textContent = week.weekNum;
        row.insertCell().textContent = week.period;
        row.insertCell().textContent = week.support;
        
        const swapCell = row.insertCell();
        const swapBtn = document.createElement('button');
        swapBtn.className = 'swap-btn';
        swapBtn.textContent = 'Trocar';
        swapBtn.addEventListener('click', () => handleSwap(week));
        swapCell.appendChild(swapBtn);
    });
    
    // Preenche contatos
    supportTeam.forEach(member => {
        const row = contactsBody.insertRow(); // Corrigido de .insertCell() para .insertRow()
        row.insertCell().textContent = member.name;
        row.insertCell().textContent = member.phone;
    });
    
    updateMonthHeader(year, month);
    updateOnCallInfo(todayOnCall || firstDayOnCall, year, month);
}

function updateMonthHeader(year, month) {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    document.getElementById('currentMonthDisplay').textContent = `${monthNames[month]} de ${year}`;
    document.getElementById('monthYearHeader').textContent = `${monthNames[month].toUpperCase()} DE ${year}`;
}

function updateOnCallInfo(onCallWeek, year, month) {
    const onCallTodayInfoDiv = document.getElementById('oncall-today-info');
    
    if (!onCallWeek) {
        onCallTodayInfoDiv.innerHTML = `
            <div class="warning">
                <p>Não há escalas definidas para este mês.</p>
            </div>
        `;
        return;
    }
    
    const todayFormatted = formatDate(today);
    const isToday = today >= onCallWeek.startDate && today <= onCallWeek.endDate;
    
    onCallTodayInfoDiv.innerHTML = `
        <h2>${isToday ? 'SOBREAVISO HOJE' : 'PRÓXIMO SOBREAVISO'}</h2>
        ${isToday ? `<p class="date">${todayFormatted}</p>` : ''}
        <p class="name">${onCallWeek.support}</p>
        <p class="phone">${onCallWeek.phone}</p>
        <p class="period">Período: ${onCallWeek.period}</p>
    `;
}

// Sistema de trocas (Sem alterações)
function handleSwap(week) {
    currentWeekToSwap = week;
    
    if (!isAdmin) {
        alert("Acesso restrito. Faça login como administrador.");
        return;
    }

    const modal = document.getElementById('swapModal');
    const modalPeriod = document.getElementById('modalPeriod');
    const select = document.getElementById('newSupportSelect');
    
    modalPeriod.textContent = week.period;
    select.innerHTML = '';
    
    supportTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        if (member.name === week.support) option.selected = true;
        select.appendChild(option);
    });
    
    modal.style.display = 'block';
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configura selects (Sem alterações)
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    monthNames.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }
    
    monthSelect.value = currentDate.getMonth();
    yearSelect.value = currentDate.getFullYear();
    
    // Event listeners (Sem alterações)
    monthSelect.addEventListener('change', () => {
        currentDate = new Date(currentDate.getFullYear(), monthSelect.value, 1);
        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    yearSelect.addEventListener('change', () => {
        currentDate = new Date(yearSelect.value, currentDate.getMonth(), 1);
        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        monthSelect.value = currentDate.getMonth();
        yearSelect.value = currentDate.getFullYear();
        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        monthSelect.value = currentDate.getMonth();
        yearSelect.value = currentDate.getFullYear();
        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    // Login Admin (Sem alterações)
    document.getElementById('adminLoginBtn').addEventListener('click', () => {
        const passwordInput = document.getElementById('adminPassword');
        
        if (passwordInput.style.display === 'none') {
            passwordInput.style.display = 'block';
        } else {
            // SENHA: labmaia123
            if (passwordInput.value === "labmaia123") {
                isAdmin = true;
                passwordInput.style.display = 'none';
                passwordInput.value = '';
                const btn = document.getElementById('adminLoginBtn');
                btn.textContent = 'Admin Logado';
                btn.style.backgroundColor = '#4CAF50';
                localStorage.setItem('adminLoggedIn', 'true');
            } else {
                alert('Senha incorreta!');
            }
        }
    });
    
    // Verifica se já está logado (Sem alterações)
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        isAdmin = true;
        const btn = document.getElementById('adminLoginBtn');
        btn.textContent = 'Admin Logado';
        btn.style.backgroundColor = '#4CAF50';
        document.getElementById('adminPassword').style.display = 'none';
    }
    
    // Fechar Modal (Sem alterações)
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('swapModal').style.display = 'none';
    });
    
    // Confirmar Troca (Firebase já integrado)
    document.getElementById('confirmSwap').addEventListener('click', () => {
        if (!currentWeekToSwap) return;
        
        const select = document.getElementById('newSupportSelect');
        const newSupport = select.value;
        
        const existingIndex = modifiedSchedule.findIndex(w => {
            return new Date(w.startDate).getTime() === currentWeekToSwap.startDate.getTime();
        });
        
        if (existingIndex >= 0) {
            modifiedSchedule[existingIndex].support = newSupport;
        } else {
            modifiedSchedule.push({
                weekNum: currentWeekToSwap.weekNum,
                period: currentWeekToSwap.period,
                startDate: currentWeekToSwap.startDate, 
                endDate: currentWeekToSwap.endDate,
                support: newSupport,
                phone: supportTeam.find(m => m.name === newSupport)?.phone || '' 
            });
        }
        
        saveModifiedScheduleToFirebase(modifiedSchedule); 
        
        document.getElementById('swapModal').style.display = 'none';
        currentWeekToSwap = null; 
    });
    
    // Fechar modal clicando fora (Sem alterações)
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('swapModal')) {
            document.getElementById('swapModal').style.display = 'none';
        }
    });
    
    // Listener do Firebase para carregar e renderizar (Já integrado)
    modifiedScheduleRef.on('value', (snapshot) => {
        const data = snapshot.val(); 
        modifiedSchedule = data ? Object.values(data) : []; 
        
        modifiedSchedule.forEach(item => {
            if (typeof item.startDate === 'string') {
                item.startDate = new Date(item.startDate);
            }
            if (typeof item.endDate === 'string') {
                item.endDate = new Date(item.endDate);
            }
        });

        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
        console.log("Dados da escala atualizados do Firebase.");
    });
});