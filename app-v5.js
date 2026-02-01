import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBvBxqXWJ8q7c8LZ8XJ7yN3xZ2nQ4Z8Q9M",
    authDomain: "planning-hub-cd575.firebaseapp.com",
    databaseURL: "https://planning-hub-cd575-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "planning-hub-cd575",
    storageBucket: "planning-hub-cd575.firebasestorage.app",
    messagingSenderId: "100641708015089217191"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Simple router
let currentPage = 'responses';

function navigate(page) {
    currentPage = page;
    render();
}

// Time helper
function timeSince(timestamp) {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Copied to clipboard!');
    });
}

// Mark response as handled
async function markResponseHandled(email) {
    const responsesRef = ref(database, 'rumacfit/emailResponses');
    const snapshot = await onValue(responsesRef, (snap) => {
        const responses = snap.val() || {};
        const updated = Object.keys(responses).reduce((acc, key) => {
            if (responses[key].email !== email) {
                acc[key] = responses[key];
            }
            return acc;
        }, {});
        set(responsesRef, updated);
    }, { onlyOnce: true });
    alert('✅ Marked as handled!');
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
            lastContact: Date.now(),
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
                <h1 class="text-2xl font-bold">🎯 Rumac Fit Sales Dashboard</h1>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="navigate('responses')" class="px-4 py-2 rounded ${isActive('responses')}">📧 Responses</button>
                    <button onclick="navigate('drafts')" class="px-4 py-2 rounded ${isActive('drafts')}">📝 Drafts</button>
                    <button onclick="navigate('profiles')" class="px-4 py-2 rounded ${isActive('profiles')}">👥 Profiles</button>
                    <button onclick="navigate('pipeline')" class="px-4 py-2 rounded ${isActive('pipeline')}">📊 Pipeline</button>
                    <button onclick="navigate('metrics')" class="px-4 py-2 rounded ${isActive('metrics')}">📈 Metrics</button>
                </div>
            </div>
        </nav>
    `;
}

// Email Responses Page - NEW!
function EmailResponses(responses) {
    const pending = responses.filter(r => !r.handled).sort((a, b) => b.timestamp - a.timestamp);
    
    return `
        <div>
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">
                        📧 Email Responses
                        <span class="ml-4 text-sm font-normal text-gray-500">${pending.length} awaiting reply</span>
                    </h2>
                </div>
            </div>

            ${pending.length === 0 ? `
                <div class="bg-white rounded-lg shadow p-12 text-center">
                    <p class="text-gray-500 text-lg">✅ All caught up! No responses waiting.</p>
                </div>
            ` : pending.map(response => `
                <div class="bg-white rounded-lg shadow p-6 mb-4">
                    <div class="flex justify-between items-start mb-4 flex-wrap gap-4">
                        <div class="flex-1 min-w-[250px]">
                            <h3 class="text-xl font-bold text-gray-900">${response.name}</h3>
                            <p class="text-sm text-gray-600 mt-1">${response.email}</p>
                            <p class="text-xs text-gray-400 mt-2">${timeSince(response.timestamp)}</p>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="copyToClipboard(\`${response.email}\`)" 
                                class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all">
                                📋 Copy Email
                            </button>
                            <button onclick="markResponseHandled('${response.email}')" 
                                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all">
                                ✅ Mark Handled
                            </button>
                        </div>
                    </div>
                    <details class="border-t pt-4" open>
                        <summary class="cursor-pointer text-blue-600 hover:text-blue-800 font-medium mb-2">Their Message</summary>
                        <div class="mt-4 bg-gray-50 p-4 rounded">
                            <pre class="whitespace-pre-wrap font-sans text-gray-800 text-sm">${response.message || 'No message content'}</pre>
                        </div>
                    </details>
                    ${response.assessment_data ? `
                        <details class="border-t pt-4 mt-4">
                            <summary class="cursor-pointer text-blue-600 hover:text-blue-800 font-medium mb-2">Assessment Data</summary>
                            <div class="mt-4 bg-blue-50 p-4 rounded text-sm">
                                ${Object.entries(response.assessment_data).map(([key, value]) => `
                                    <div class="mb-2"><strong>${key}:</strong> ${value}</div>
                                `).join('')}
                            </div>
                        </details>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Client Profiles Page
function ClientProfiles(leads, drafts) {
    const enrichedLeads = leads.map(lead => {
        const leadDrafts = drafts.filter(d => d.leadId === lead.id);
        const conversations = lead.conversations || [];
        const responseCount = conversations.filter(c => c.from === 'lead').length;
        const ourMessageCount = conversations.filter(c => c.from === 'us').length;
        
        // Determine status
        let status = 'Waiting for Reply';
        let statusColor = 'bg-yellow-100 text-yellow-800';
        
        if (lead.stage === 'converted') {
            status = 'Converted ✅';
            statusColor = 'bg-green-100 text-green-800';
        } else if (lead.stage === 'cold') {
            status = 'Cold ❄️';
            statusColor = 'bg-gray-100 text-gray-800';
        } else if (responseCount > ourMessageCount) {
            status = 'Awaiting Our Reply';
            statusColor = 'bg-red-100 text-red-800';
        } else if (leadDrafts.some(d => d.status === 'pending')) {
            status = 'Draft Ready';
            statusColor = 'bg-blue-100 text-blue-800';
        }
        
        return {
            ...lead,
            responseCount,
            ourMessageCount,
            totalMessages: responseCount + ourMessageCount,
            status,
            statusColor,
            lastResponse: conversations.filter(c => c.from === 'lead').sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp,
            lastOurMessage: conversations.filter(c => c.from === 'us').sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
        };
    }).sort((a, b) => {
        // Priority: awaiting reply > draft ready > waiting for reply > cold > converted
        const priority = {
            'Awaiting Our Reply': 1,
            'Draft Ready': 2,
            'Waiting for Reply': 3,
            'Cold ❄️': 4,
            'Converted ✅': 5
        };
        return (priority[a.status] || 99) - (priority[b.status] || 99);
    });
    
    const stats = {
        awaitingReply: enrichedLeads.filter(l => l.status === 'Awaiting Our Reply').length,
        draftReady: enrichedLeads.filter(l => l.status === 'Draft Ready').length,
        waitingForReply: enrichedLeads.filter(l => l.status === 'Waiting for Reply').length,
        cold: enrichedLeads.filter(l => l.status === 'Cold ❄️').length,
        converted: enrichedLeads.filter(l => l.status === 'Converted ✅').length
    };
    
    return `
        <div>
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Client Profiles Overview</h2>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="bg-red-50 p-4 rounded">
                        <p class="text-3xl font-bold text-red-600">${stats.awaitingReply}</p>
                        <p class="text-sm text-gray-600">Awaiting Reply</p>
                    </div>
                    <div class="bg-blue-50 p-4 rounded">
                        <p class="text-3xl font-bold text-blue-600">${stats.draftReady}</p>
                        <p class="text-sm text-gray-600">Draft Ready</p>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded">
                        <p class="text-3xl font-bold text-yellow-600">${stats.waitingForReply}</p>
                        <p class="text-sm text-gray-600">Waiting</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded">
                        <p class="text-3xl font-bold text-gray-600">${stats.cold}</p>
                        <p class="text-sm text-gray-600">Cold</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded">
                        <p class="text-3xl font-bold text-green-600">${stats.converted}</p>
                        <p class="text-sm text-gray-600">Converted</p>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                ${enrichedLeads.map(lead => `
                    <div class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-all">
                        <div class="flex justify-between items-start flex-wrap gap-4">
                            <div class="flex-1 min-w-[200px]">
                                <h3 class="text-lg font-bold text-gray-900">${lead.name || 'Unknown'}</h3>
                                <p class="text-sm text-gray-600">${lead.email || 'No email'}</p>
                                ${lead.painPoint ? `<p class="text-sm text-blue-600 mt-1">🎯 ${lead.painPoint}</p>` : ''}
                            </div>
                            
                            <div class="flex gap-3 items-center flex-wrap">
                                <span class="px-3 py-1 rounded-full text-xs font-medium ${lead.statusColor}">
                                    ${lead.status}
                                </span>
                                <div class="text-sm text-gray-500 text-right">
                                    <p>💬 ${lead.totalMessages} messages</p>
                                    <p class="text-xs">${lead.responseCount} from them, ${lead.ourMessageCount} from us</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t text-sm">
                            <div>
                                <p class="text-gray-500">Form Completed</p>
                                <p class="font-medium">${lead.assessmentCompletedAt ? formatDate(lead.assessmentCompletedAt) : 'Not completed'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">Last Response</p>
                                <p class="font-medium">${lead.lastResponse ? formatDate(lead.lastResponse) : 'Never'}</p>
                                ${lead.lastResponse ? `<p class="text-xs text-gray-400">${timeSince(lead.lastResponse)}</p>` : ''}
                            </div>
                            <div>
                                <p class="text-gray-500">Last Contact</p>
                                <p class="font-medium">${lead.lastOurMessage ? formatDate(lead.lastOurMessage) : 'Never'}</p>
                                ${lead.lastOurMessage ? `<p class="text-xs text-gray-400">${timeSince(lead.lastOurMessage)}</p>` : ''}
                            </div>
                        </div>
                        
                        <div class="mt-3 flex gap-2">
                            <span class="text-xs px-2 py-1 bg-gray-100 rounded">${lead.source || 'unknown'}</span>
                            <span class="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">${lead.stage || 'unknown stage'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Draft Queue Page
function DraftQueue(drafts, leads, lastUpdated) {
    const pending = drafts.filter(d => d.status === 'pending').map(draft => {
        const lead = leads.find(l => l.id === draft.leadId);
        return {
            ...draft,
            leadAssessmentDate: lead?.assessmentCompletedAt,
            leadLastResponse: lead?.lastResponse
        };
    }).sort((a, b) => a.createdAt - b.createdAt);
    
    return `
        <div>
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">
                        📝 Draft Queue
                        <span class="ml-4 text-sm font-normal text-gray-500">${pending.length} drafts waiting</span>
                    </h2>
                    <div class="text-sm text-gray-500">
                        Last updated: ${lastUpdated ? timeSince(lastUpdated) : 'Never'}
                    </div>
                </div>
            </div>

            ${pending.length === 0 ? `
                <div class="bg-white rounded-lg shadow p-12 text-center">
                    <p class="text-gray-500 text-lg">✅ All caught up! No drafts waiting.</p>
                </div>
            ` : pending.map(draft => `
                <div class="bg-white rounded-lg shadow p-6 mb-4">
                    <div class="flex justify-between items-start mb-4 flex-wrap gap-4">
                        <div class="flex-1 min-w-[250px]">
                            <h3 class="text-xl font-bold text-gray-900">${draft.leadName}</h3>
                            <p class="text-gray-600 mt-1">🎯 ${draft.painPoint}</p>
                            <div class="mt-3 space-y-1 text-sm text-gray-500">
                                ${draft.leadAssessmentDate ? `<p>📋 Form completed: ${formatDate(draft.leadAssessmentDate)} (${timeSince(draft.leadAssessmentDate)})</p>` : ''}
                                ${draft.leadLastResponse ? `<p>💬 Last responded: ${formatDate(draft.leadLastResponse)} (${timeSince(draft.leadLastResponse)})</p>` : ''}
                                <p>✍️ Draft created: ${timeSince(draft.createdAt)}</p>
                            </div>
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
        { key: 'workshop_delivered', label: 'Workshop Delivered', color: 'bg-purple-500' },
        { key: 'assessment_complete', label: 'Assessment Complete', color: 'bg-blue-500' },
        { key: 'email2_sent', label: 'Email 2 Sent', color: 'bg-yellow-500' },
        { key: 'email3_sent', label: 'Follow-up Sent', color: 'bg-orange-500' },
        { key: 'replied', label: 'Replied', color: 'bg-green-500' },
        { key: 'converted', label: 'Converted 💰', color: 'bg-emerald-600' },
        { key: 'cold', label: 'Cold', color: 'bg-gray-500' }
    ];

    const getCount = (stage) => leads.filter(l => l.stage === stage).length;
    
    return `
        <div>
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">📊 Sales Pipeline</h2>
                <div class="space-y-4">
                    ${stages.map(stage => {
                        const count = getCount(stage.key);
                        const stageLeads = leads.filter(l => l.stage === stage.key);
                        return `
                            <div>
                                <div class="flex items-center gap-4 mb-2">
                                    <div class="${stage.color} text-white px-4 py-2 rounded-lg font-bold min-w-[200px]">
                                        ${stage.label}
                                    </div>
                                    <div class="text-2xl font-bold text-gray-700">${count}</div>
                                </div>
                                ${stageLeads.length > 0 ? `
                                    <div class="ml-4 pl-4 border-l-2 border-gray-200 text-sm text-gray-600 space-y-1">
                                        ${stageLeads.slice(0, 5).map(l => `<p>• ${l.name || 'Unknown'} ${l.lastUpdated ? `(${timeSince(l.lastUpdated)})` : ''}</p>`).join('')}
                                        ${stageLeads.length > 5 ? `<p class="text-gray-400">... and ${stageLeads.length - 5} more</p>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Conversion Funnel</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span>Workshop → Assessment</span>
                        <span class="font-bold">${getCount('workshop_delivered') > 0 ? ((getCount('assessment_complete') / getCount('workshop_delivered')) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Assessment → Email 2</span>
                        <span class="font-bold">${getCount('assessment_complete') > 0 ? ((getCount('email2_sent') / getCount('assessment_complete')) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Email 2 → Reply</span>
                        <span class="font-bold">${getCount('email2_sent') > 0 ? ((getCount('replied') / getCount('email2_sent')) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Reply → Conversion</span>
                        <span class="font-bold">${getCount('replied') > 0 ? ((getCount('converted') / getCount('replied')) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div class="flex justify-between items-center pt-3 border-t-2 border-gray-800">
                        <span class="font-bold">Overall Conversion</span>
                        <span class="font-bold text-green-600">${getCount('workshop_delivered') > 0 ? ((getCount('converted') / getCount('workshop_delivered')) * 100).toFixed(1) : 0}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Metrics Page
function Metrics(leads) {
    const now = Date.now();
    const DAY = 86400000;
    const WEEK = 7 * DAY;
    
    const thisWeek = leads.filter(l => l.dateAdded && (now - new Date(l.dateAdded).getTime()) < WEEK);
    const converted = leads.filter(l => l.stage === 'converted');
    const revenue = converted.length * 149;
    
    const avgResponseTime = leads
        .filter(l => l.lastResponse && l.assessmentCompletedAt)
        .map(l => l.lastResponse - l.assessmentCompletedAt)
        .reduce((sum, time, _, arr) => sum + time / arr.length, 0);
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">New Leads (7d)</h3>
                <p class="text-4xl font-bold text-blue-600">${thisWeek.length}</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Total Conversions</h3>
                <p class="text-4xl font-bold text-green-600">${converted.length}</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Revenue</h3>
                <p class="text-4xl font-bold text-emerald-600">$${revenue}</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Conversion Rate</h3>
                <p class="text-4xl font-bold text-purple-600">${leads.length > 0 ? ((converted.length / leads.length) * 100).toFixed(1) : 0}%</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Avg Response Time</h3>
                <p class="text-4xl font-bold text-orange-600">${avgResponseTime ? timeSince(now - avgResponseTime) : 'N/A'}</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Active Leads</h3>
                <p class="text-4xl font-bold text-cyan-600">${leads.filter(l => !['converted', 'cold'].includes(l.stage)).length}</p>
            </div>
        </div>
    `;
}

// Main render
function render() {
    const leadsRef = ref(database, 'rumacfit/leads');
    const draftsRef = ref(database, 'rumacfit/drafts');
    const responsesRef = ref(database, 'rumacfit/emailResponses');
    
    Promise.all([
        new Promise(resolve => onValue(leadsRef, snap => resolve(snap.val()), { onlyOnce: true })),
        new Promise(resolve => onValue(draftsRef, snap => resolve(snap.val()), { onlyOnce: true })),
        new Promise(resolve => onValue(responsesRef, snap => resolve(snap.val()), { onlyOnce: true }))
    ]).then(([leadsData, draftsData, responsesData]) => {
        const leads = leadsData ? Object.keys(leadsData).map(k => ({ id: k, ...leadsData[k] })) : [];
        const drafts = draftsData ? Object.keys(draftsData).map(k => ({ id: k, ...draftsData[k] })) : [];
        const responses = responsesData ? Object.keys(responsesData).map(k => ({ id: k, ...responsesData[k] })) : [];
        
        let pageContent = '';
        switch (currentPage) {
            case 'responses':
                pageContent = EmailResponses(responses);
                break;
            case 'profiles':
                pageContent = ClientProfiles(leads, drafts);
                break;
            case 'drafts':
                pageContent = DraftQueue(drafts, leads, Date.now());
                break;
            case 'pipeline':
                pageContent = Pipeline(leads);
                break;
            case 'metrics':
                pageContent = Metrics(leads);
                break;
        }
        
        document.getElementById('app').innerHTML = Navigation() + `
            <div class="max-w-7xl mx-auto p-4 md:p-6">
                ${pageContent}
            </div>
        `;
    });
}

// Make functions global
window.navigate = navigate;
window.copyToClipboard = copyToClipboard;
window.markAsSent = markAsSent;
window.markResponseHandled = markResponseHandled;

// Initial render
render();
