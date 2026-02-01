import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBvBxqXWJ8q7c8LZ8XJ7yN3xZ2nQ4Z8Q9M",
    authDomain: "planning-hub-cd575.firebaseapp.com",
    databaseURL: "https://planning-hub-cd575-default-rtdb.firebaseio.com",
    projectId: "planning-hub-cd575",
    storageBucket: "planning-hub-cd575.firebasestorage.app",
    messagingSenderId: "100641708015089217191"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Simple router
let currentPage = 'drafts';

function navigate(page) {
    currentPage = page;
    render();
}

// Time helper
function timeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Copied to clipboard!');
    });
}

// Mark as sent
async function markAsSent(draftId, leadId) {
    await update(ref(database, `rumacfit/drafts/${draftId}`), {
        status: 'sent',
        sentAt: Date.now()
    });
    
    if (leadId) {
        await update(ref(database, `rumacfit/leads/${leadId}`), {
            stage: 'email2_sent',
            lastUpdated: Date.now()
        });
    }
    
    alert('✅ Marked as sent!');
}

// Navigation component
function Navigation() {
    const isActive = (page) => currentPage === page ? 'bg-blue-600' : 'hover:bg-gray-700';
    
    return `
        <nav class="bg-gray-900 text-white p-4">
            <div class="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
                <h1 class="text-2xl font-bold">Rumac Fit Sales</h1>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="navigate('drafts')" class="px-4 py-2 rounded ${isActive('drafts')}">Drafts</button>
                    <button onclick="navigate('pipeline')" class="px-4 py-2 rounded ${isActive('pipeline')}">Pipeline</button>
                    <button onclick="navigate('tasks')" class="px-4 py-2 rounded ${isActive('tasks')}">Tasks</button>
                    <button onclick="navigate('metrics')" class="px-4 py-2 rounded ${isActive('metrics')}">Metrics</button>
                </div>
            </div>
        </nav>
    `;
}

// Draft Queue Page
function DraftQueue(drafts, lastUpdated) {
    const pending = drafts.filter(d => d.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
    
    return `
        <div>
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">
                        Draft Queue
                        <span class="ml-4 text-sm font-normal text-gray-500">${pending.length} drafts waiting</span>
                    </h2>
                    <div class="text-sm text-gray-500">
                        Last updated: ${lastUpdated ? timeSince(lastUpdated) : 'Never'}
                    </div>
                </div>
            </div>

            ${pending.length === 0 ? `
                <div class="bg-white rounded-lg shadow p-12 text-center">
                    <p class="text-gray-500 text-lg">All caught up! No drafts waiting.</p>
                </div>
            ` : pending.map(draft => `
                <div class="bg-white rounded-lg shadow p-6 mb-4">
                    <div class="flex justify-between items-start mb-4 flex-wrap gap-4">
                        <div class="flex-1 min-w-[250px]">
                            <h3 class="text-xl font-bold text-gray-900">${draft.leadName}</h3>
                            <p class="text-gray-600 mt-1">${draft.painPoint}</p>
                            <p class="text-sm text-gray-400 mt-2">Assessment completed: ${timeSince(draft.createdAt)}</p>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="copyToClipboard(\`${draft.body.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" 
                                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all">
                                📋 Copy
                            </button>
                            <button onclick="markAsSent('${draft.id}', '${draft.leadId}')" 
                                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all">
                                ✅ Mark Sent
                            </button>
                        </div>
                    </div>
                    <details class="border-t pt-4">
                        <summary class="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">Show full draft</summary>
                        <div class="mt-4 bg-gray-50 p-4 rounded">
                            <p class="font-bold text-sm text-gray-700 mb-2">Subject: ${draft.subject}</p>
                            <pre class="whitespace-pre-wrap font-sans text-gray-800">${draft.body}</pre>
                        </div>
                    </details>
                </div>
            `).join('')}
        </div>
    `;
}

// Pipeline Page
function Pipeline(leads) {
    const stages = [
        { key: 'assessment_complete', label: 'Assessment Complete', color: 'bg-blue-500' },
        { key: 'email2_sent', label: 'Email 2 Sent', color: 'bg-yellow-500' },
        { key: 'replied', label: 'Replied', color: 'bg-purple-500' },
        { key: 'converted', label: 'Converted', color: 'bg-green-500' },
        { key: 'cold', label: 'Cold', color: 'bg-gray-500' }
    ];

    const getCount = (stage) => leads.filter(l => l.stage === stage).length;
    const getRate = (from, to) => {
        const fromCount = getCount(from);
        const toCount = getCount(to);
        return fromCount > 0 ? ((toCount / fromCount) * 100).toFixed(1) : 0;
    };

    const maxCount = Math.max(...stages.map(s => getCount(s.key)), 1);

    return `
        <div>
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Sales Pipeline</h2>
            <div class="bg-white rounded-lg shadow p-8">
                ${stages.map((stage, i) => {
                    const count = getCount(stage.key);
                    const width = Math.max((count / maxCount) * 100, 10);
                    return `
                        <div class="mb-6">
                            <div class="flex items-center gap-4 mb-2">
                                <span class="text-sm font-medium text-gray-700 w-48">${stage.label}</span>
                                <div class="flex-1 bg-gray-200 rounded-full h-12">
                                    <div class="${stage.color} h-12 rounded-full flex items-center justify-center text-white font-bold"
                                         style="width: ${width}%">
                                        ${count}
                                    </div>
                                </div>
                            </div>
                            ${i < stages.length - 1 ? `
                                <div class="ml-48 pl-4 text-sm text-gray-500">
                                    → ${getRate(stages[i].key, stages[i + 1].key)}% conversion
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Tasks Page
function Tasks(leads, drafts) {
    const now = Date.now();
    const HOUR_48 = 48 * 60 * 60 * 1000;
    const HOUR_96 = 96 * 60 * 60 * 1000;

    const hotLeads = leads.filter(l => l.stage === 'replied');
    const needingEmail2 = leads.filter(l => 
        l.stage === 'assessment_complete' &&
        !drafts.some(d => d.leadId === l.id && d.status === 'pending')
    );
    const followUp48h = leads.filter(l => {
        if (l.stage !== 'email2_sent') return false;
        const timeSince = now - l.lastUpdated;
        return timeSince >= HOUR_48 && timeSince < (HOUR_48 + 24 * 60 * 60 * 1000);
    });
    const followUp96h = leads.filter(l => {
        if (l.stage !== 'email2_sent') return false;
        return (now - l.lastUpdated) >= HOUR_96;
    });

    const TaskSection = (title, taskLeads, priority, actionText) => {
        if (taskLeads.length === 0) return '';
        const colors = {
            high: 'border-red-500 bg-red-50',
            medium: 'border-yellow-500 bg-yellow-50',
            low: 'border-blue-500 bg-blue-50'
        };
        return `
            <div class="border-l-4 ${colors[priority]} p-6 rounded-lg mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">${title} (${taskLeads.length})</h3>
                ${taskLeads.map(lead => `
                    <div class="bg-white p-4 rounded shadow-sm mb-3">
                        <div class="font-medium text-gray-900">${lead.name}</div>
                        <div class="text-sm text-gray-600">${lead.email}</div>
                        ${lead.painPoint ? `<div class="text-sm text-gray-500 mt-1">Pain: ${lead.painPoint}</div>` : ''}
                        <div class="mt-2 text-sm font-medium text-blue-600">→ ${actionText}</div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    const allSections = [
        TaskSection('🔥 Hot Leads (Replied)', hotLeads, 'high', 'Reply ASAP - they\'re engaged!'),
        TaskSection('📝 New Assessments Needing Email 2', needingEmail2, 'medium', 'Draft Email 2 (sales bridge)'),
        TaskSection('⏰ 48-Hour Follow-Ups Due', followUp48h, 'medium', 'Send Email 3 (case study + social proof)'),
        TaskSection('⏰ 96-Hour Follow-Ups Due', followUp96h, 'low', 'Send Email 4 (handle objections)')
    ].filter(Boolean).join('');

    return `
        <div>
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Today's Tasks</h2>
            ${allSections || `
                <div class="bg-white rounded-lg shadow p-12 text-center">
                    <p class="text-gray-500 text-lg">All caught up! No tasks today. 🎉</p>
                </div>
            `}
        </div>
    `;
}

// Metrics Page
function Metrics(leads) {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const getWeekLeads = (start) => {
        return leads.filter(l => {
            const date = new Date(l.dateAdded);
            return date >= start && date < new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        }).length;
    };

    const thisWeekLeads = getWeekLeads(thisWeekStart);
    const lastWeekLeads = getWeekLeads(lastWeekStart);
    const weekChange = lastWeekLeads > 0 ? (((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100).toFixed(1) : 0;

    const converted = leads.filter(l => l.stage === 'converted').length;
    const conversionRate = leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) : 0;

    const thisWeekRevenue = leads.filter(l => {
        if (l.stage !== 'converted') return false;
        const date = new Date(l.lastUpdated);
        return date >= thisWeekStart;
    }).length * 149;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthRevenue = leads.filter(l => {
        if (l.stage !== 'converted') return false;
        const date = new Date(l.lastUpdated);
        return date >= monthStart;
    }).length * 149;

    const pack6Leads = leads.filter(l => l.source === 'pack6').length;
    const pack7Leads = leads.filter(l => l.source === 'pack7').length;
    const pack6Conv = leads.filter(l => l.source === 'pack6' && l.stage === 'converted').length;
    const pack7Conv = leads.filter(l => l.source === 'pack7' && l.stage === 'converted').length;
    const pack6Rate = pack6Leads > 0 ? ((pack6Conv / pack6Leads) * 100).toFixed(1) : 0;
    const pack7Rate = pack7Leads > 0 ? ((pack7Conv / pack7Leads) * 100).toFixed(1) : 0;

    return `
        <div>
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Metrics</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="text-sm text-gray-600 mb-2">Revenue This Week</div>
                    <div class="text-3xl font-bold text-green-600">$${thisWeekRevenue}</div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="text-sm text-gray-600 mb-2">Revenue This Month</div>
                    <div class="text-3xl font-bold text-green-600">$${thisMonthRevenue}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="text-sm text-gray-600 mb-2">Leads This Week</div>
                    <div class="text-3xl font-bold text-blue-600">${thisWeekLeads}</div>
                    <div class="text-sm text-gray-500 mt-2">${weekChange > 0 ? '+' : ''}${weekChange}% vs last week</div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="text-sm text-gray-600 mb-2">Overall Conversion Rate</div>
                    <div class="text-3xl font-bold text-purple-600">${conversionRate}%</div>
                    <div class="text-sm text-gray-500 mt-2">${converted} / ${leads.length} leads converted</div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Pack 6 vs Pack 7</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div class="text-2xl font-bold text-blue-600">Pack 6</div>
                        <div class="mt-2">
                            <div class="text-sm text-gray-600">Leads: ${pack6Leads}</div>
                            <div class="text-sm text-gray-600">Converted: ${pack6Conv}</div>
                            <div class="text-lg font-bold text-green-600 mt-2">${pack6Rate}% CR</div>
                        </div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-purple-600">Pack 7</div>
                        <div class="mt-2">
                            <div class="text-sm text-gray-600">Leads: ${pack7Leads}</div>
                            <div class="text-sm text-gray-600">Converted: ${pack7Conv}</div>
                            <div class="text-lg font-bold text-green-600 mt-2">${pack7Rate}% CR</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Main render
let allDrafts = [];
let allLeads = [];
let lastUpdated = null;

function render() {
    const content = currentPage === 'drafts' ? DraftQueue(allDrafts, lastUpdated) :
                   currentPage === 'pipeline' ? Pipeline(allLeads) :
                   currentPage === 'tasks' ? Tasks(allLeads, allDrafts) :
                   Metrics(allLeads);

    document.getElementById('app').innerHTML = Navigation() + `
        <div class="max-w-7xl mx-auto p-4">${content}</div>
    `;
}

// Listen to Firebase
onValue(ref(database, 'rumacfit/drafts'), (snapshot) => {
    const data = snapshot.val();
    allDrafts = data ? Object.entries(data).map(([id, draft]) => ({ id, ...draft })) : [];
    lastUpdated = Date.now();
    render();
});

onValue(ref(database, 'rumacfit/leads'), (snapshot) => {
    const data = snapshot.val();
    allLeads = data ? Object.entries(data).map(([id, lead]) => ({ id, ...lead })) : [];
    render();
});

// Make functions global
window.navigate = navigate;
window.copyToClipboard = copyToClipboard;
window.markAsSent = markAsSent;

// Initial render
render();
