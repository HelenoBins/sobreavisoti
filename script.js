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
    // IMPORTANTE: Adicione o databaseURL, que é específico para o Realtime Database
    databaseURL: "https://escala-plantonistas-app-default-rtdb.firebaseio.com" 
};

// Inicialize o Firebase usando a versão compat (que você carregou no HTML)
const app = firebase.initializeApp(firebaseConfig);
// Para este projeto de sincronização, não precisamos do analytics agora, então vou comentar.
// const analytics = getAnalytics(app); 

// Obtenha uma referência para o Realtime Database
const database = firebase.database();
// Crie uma referência para o nó 'modifiedSchedule' no seu banco de dados
// É aqui que suas trocas serão armazenadas
const modifiedScheduleRef = database.ref('modifiedSchedule');

// Função para SALVAR as trocas no Firebase
function saveModifiedScheduleToFirebase(scheduleData) {
    // Definir os dados na sua referência. Isso sobrescreve os dados existentes nesse nó.
    // As datas são convertidas para string ISO para serem salvas corretamente no Firebase.
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


// Funções auxiliares (Sem alterações)
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

// Geração da escala com persistência de trocas
function generateSchedule(year, month) {
    const schedule = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let currentWeekStart = new Date(firstDayOfMonth);
    while (currentWeekStart.getDay() !== 1) { // Ajusta para a segunda-feira da semana que contém o dia 1 do mês
        currentWeekStart.setDate(currentWeekStart.getDate() - 1);
    }

    let weekCounter = 1;
    // Garante que currentWeekStart não esteja muito no passado do mês anterior
    // Isso é importante para meses onde o dia 1 começa no meio da semana anterior
    let iterationLimit = new Date(year, month + 2, 0); // Vai até o final do próximo mês para garantir todas as semanas
    
    while (currentWeekStart <= lastDayOfMonth || (currentWeekStart.getMonth() === month && currentWeekStart.getFullYear() === year) || currentWeekStart < iterationLimit) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const daysInThisMonth = countDaysInMonth(currentWeekStart, weekEnd, month, year);
        
        if (daysInThisMonth >= 4 || (currentWeekStart.getMonth() === month || weekEnd.getMonth() === month)) { // Inclui semanas que abrangem o mês mas têm menos de 4 dias no mês
            const weeksSinceReference = getDiffWeeks(scheduleStartReference, currentWeekStart);
            let supportPerson = supportTeam[weeksSinceReference % supportTeam.length];
            
            // Verifica se há modificação para esta semana
            const modifiedWeek = modifiedSchedule.find(w => {
                // Compara getTime() para objetos Date convertidos corretamente
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
                startDate: new Date(currentWeekStart), // Garante que é um objeto Date
                endDate: new Date(weekEnd) // Garante que é um objeto Date
            });
            weekCounter++;
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
         // Se a semana atual passou completamente do mês e já iteramos mais do que o necessário, pare.
        if (currentWeekStart > lastDayOfMonth && currentWeekStart.getMonth() !== month) {
            break; 
        }
    }
    return schedule;
}

// Renderização (Mantenha esta função como está)
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
        
        // Verifica se a primeira semana do mês contém o dia 1 do mês
        // ou se é a semana que 'pelo menos começa' no mês
        const monthFirstDay = new Date(year, month, 1);
        if (!firstDayOnCall && week.startDate <= monthFirstDay && week.endDate >= monthFirstDay) {
             firstDayOnCall = week;
        } else if (!firstDayOnCall && week.startDate.getMonth() === month && week.startDate.getDate() <= 7) {
            // Se a primeira semana calculada está dentro do mês e nos primeiros 7 dias
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
        const row = contactsBody.insertRow(); // Era contactsBody.insertCell(), corrigi para insertRow()
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

// Sistema de trocas (Mantenha esta função como está)
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
            // SENHA: labmaia123 (altere para a senha real que desejar)
            if (passwordInput.value === "labmaia123") {
                isAdmin = true;
                passwordInput.style.display = 'none';
                passwordInput.value = '';
                const btn = document.getElementById('adminLoginBtn');
                btn.textContent = 'Admin Logado';
                btn.style.backgroundColor = '#4CAF50';
                // Salva o estado de login
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
    
    // Confirmar Troca (MODIFICADA PARA USAR FIREBASE)
    document.getElementById('confirmSwap').addEventListener('click', () => {
        if (!currentWeekToSwap) return;
        
        const select = document.getElementById('newSupportSelect');
        const newSupport = select.value;
        
        // Atualiza os dados no array local 'modifiedSchedule'
        const existingIndex = modifiedSchedule.findIndex(w => {
            // Compara o timestamp para garantir que é a mesma semana
            return new Date(w.startDate).getTime() === currentWeekToSwap.startDate.getTime();
        });
        
        if (existingIndex >= 0) {
            modifiedSchedule[existingIndex].support = newSupport;
        } else {
            // Se a semana não existe, adiciona uma nova modificação
            modifiedSchedule.push({
                weekNum: currentWeekToSwap.weekNum,
                period: currentWeekToSwap.period,
                // As datas já serão convertidas para ISO string na função saveModifiedScheduleToFirebase
                startDate: currentWeekToSwap.startDate, 
                endDate: currentWeekToSwap.endDate,
                support: newSupport,
                phone: supportTeam.find(m => m.name === newSupport)?.phone || '' // Adiciona o telefone do novo suporte
            });
        }
        
        // =====================================================================
        // MODIFICAÇÃO: Salvar no Firebase em vez de localStorage
        // =====================================================================
        saveModifiedScheduleToFirebase(modifiedSchedule); 
        // =====================================================================
        
        // A renderização e o alerta serão acionados automaticamente
        // pelo listener do Firebase quando os dados forem atualizados.
        document.getElementById('swapModal').style.display = 'none';
        currentWeekToSwap = null; // Limpa a semana após a troca
    });
    
    // Fechar modal clicando fora (Sem alterações)
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('swapModal')) {
            document.getElementById('swapModal').style.display = 'none';
        }
    });
    
    // =====================================================================
    // MODIFICAÇÃO: Listener do Firebase para carregar e renderizar
    // =====================================================================
    // Este listener é chamado uma vez no início e SEMPRE que os dados mudam no Firebase
    modifiedScheduleRef.on('value', (snapshot) => {
        const data = snapshot.val(); // Pega os dados do Firebase
        // O Firebase pode retornar um objeto se houver chaves automáticas.
        // Convertemos para array se necessário.
        // Se 'data' for null (banco de dados vazio), initialize com um array vazio.
        modifiedSchedule = data ? Object.values(data) : []; 
        
        // IMPORTANTE: As datas são salvas como strings ISO no Firebase.
        // Precisamos convertê-las de volta para objetos Date ao carregar.
        modifiedSchedule.forEach(item => {
            if (typeof item.startDate === 'string') {
                item.startDate = new Date(item.startDate);
            }
            if (typeof item.endDate === 'string') {
                item.endDate = new Date(item.endDate);
            }
        });

        // Agora que os dados modificados foram carregados, renderize a escala.
        renderSchedule(currentDate.getFullYear(), currentDate.getMonth());
        console.log("Dados da escala atualizados do Firebase.");
    });
    // =====================================================================

    // A renderização inicial agora é feita pelo listener do Firebase
    // renderSchedule(currentDate.getFullYear(), currentDate.getMonth()); // Remova esta linha
});