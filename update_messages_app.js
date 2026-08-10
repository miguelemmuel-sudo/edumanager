const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const messagesCRUD = `
// --- MESSAGES ---
let currentChat = '';

async function fetchAndRenderMessages() {
    const msgList = document.getElementById('msgList');
    if (!msgList) return;

    // Fetch messages
    const { data: messages, error } = await window.supabase.from('messages').select('*').order('date_envoi', { ascending: false });
    if (error) return console.error(error);

    // Group messages by 'sujet' (which acts as the conversation partner / group)
    const conversations = {};
    messages.forEach(m => {
        let chatName = m.sujet || 'Général';
        if (chatName.startsWith('To: ')) chatName = chatName.substring(4);
        if (!conversations[chatName]) conversations[chatName] = [];
        conversations[chatName].push(m);
    });

    // Dummy conversation if none exist
    if (Object.keys(conversations).length === 0) {
        conversations['M. Diallo Parent'] = [
            { id: '1', contenu: 'Bonjour M. le Directeur, je voudrais avoir des informations sur les résultats.', date_envoi: new Date().toISOString(), expediteur_id: 'parent' }
        ];
    }

    msgList.innerHTML = '';
    for (const [name, msgs] of Object.entries(conversations)) {
        const lastMsg = msgs[0];
        const initial = name.charAt(0).toUpperCase();
        
        const div = document.createElement('div');
        div.className = 'msg-item ' + (currentChat === name ? 'active' : '');
        div.innerHTML = \`
            <div class="msg-item-av" style="background:#2563EB">\${initial}</div>
            <div class="msg-item-content">
                <div class="d-flex justify-content-between align-items-baseline mb-1">
                    <span class="msg-item-name">\${_e(name)}</span>
                    <span class="msg-item-time">\${new Date(lastMsg.date_envoi).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="msg-item-preview">\${_e(lastMsg.contenu).substring(0, 40)}...</div>
            </div>
        \`;
        div.onclick = () => {
            document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            openChat(name, msgs);
        };
        msgList.appendChild(div);
    }
    
    if(!currentChat && Object.keys(conversations).length > 0) {
        const firstName = Object.keys(conversations)[0];
        openChat(firstName, conversations[firstName]);
        msgList.firstChild.classList.add('active');
    }
}

function openChat(name, msgs) {
    currentChat = name;
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatName').textContent = name;
    document.getElementById('chatHeaderAv').textContent = name.charAt(0).toUpperCase();
    
    const body = document.getElementById('chatBody');
    body.innerHTML = '';
    
    // Sort ascending for display
    msgs.sort((a,b) => new Date(a.date_envoi) - new Date(b.date_envoi)).forEach(m => {
        // If expediteur_id is null, it means we sent it (as admin) for this mockup
        const isSent = m.expediteur_id === null; 
        let bubbleClass = isSent ? 'sent' : 'received';
        let metaClass = isSent ? 'sent-meta' : '';
        let sender = isSent ? 'Vous' : name.split(' ')[0];
        let time = new Date(m.date_envoi).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        
        let smsIndicator = '';
        if (isSent && name.toLowerCase().includes('parent')) {
            smsIndicator = ' &middot; <i class="fas fa-sms text-success" title="Notifié par SMS"></i> SMS envoyé';
        }
        
        body.innerHTML += \`<div class="bubble \${bubbleClass}">\${_e(m.contenu).replace(/\\n/g,'<br>')}</div><div class="bubble-meta \${metaClass}">\${sender} &middot; \${time}\${smsIndicator}</div>\`;
    });
    
    body.scrollTop = body.scrollHeight;
}

window.sendMessage = async function() {
    const inp = document.getElementById('msgInput');
    const txt = inp.value.trim();
    if (!txt || !currentChat) return;
    
    const { error } = await window.supabase.from('messages').insert([{
        sujet: 'To: ' + currentChat,
        contenu: txt,
        destinataire_id: null, // Bypass FK constraint for the mockup
        expediteur_id: null
    }]);
    
    if (error) {
        if(window.showToast) window.showToast(error.message, 'danger');
    } else {
        inp.value = '';
        fetchAndRenderMessages();
        if (currentChat.toLowerCase().includes('parent')) {
            if(window.showToast) window.showToast('Message et SMS envoyés avec succès', 'success');
        }
    }
}

window.sendNewMessage = async function() {
    const form = getFormData('formAddMessage');
    if (!form.destinataire_grp || !form.contenu) {
        if(window.showToast) window.showToast('Veuillez remplir le destinataire et le message', 'warning');
        return;
    }
    
    const { error } = await window.supabase.from('messages').insert([{
        sujet: 'To: ' + form.destinataire_grp,
        contenu: form.contenu,
        destinataire_id: null,
        expediteur_id: null
    }]);
    
    if (error) {
        if(window.showToast) window.showToast(error.message, 'danger');
    } else {
        bootstrap.Modal.getInstance(document.getElementById('newMsgModal')).hide();
        clearFormData('newMsgModal');
        fetchAndRenderMessages();
        if (form.destinataire_grp.toLowerCase().includes('parent')) {
            if(window.showToast) window.showToast('Message et SMS envoyés avec succès', 'success');
        } else {
            if(window.showToast) window.showToast('Message envoyé', 'success');
        }
    }
}

window.handleEnter = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendMessage(); }
}

window.insertEmoji = function() {
    const inp = document.getElementById('msgInput');
    inp.value += ' 😊';
    inp.focus();
}

window.handleFileUpload = function(event) {
    if (event.target.files.length > 0) {
        if (typeof window.showToast === 'function') {
            window.showToast("Fichier joint : " + event.target.files[0].name, 'info');
        }
        event.target.value = '';
    }
}
`;

const startIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + messagesCRUD + '\n\n' + appJs.substring(startIdx);
    
    // Add to initial loaders
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderMessages();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Messages CRUD logic injected');
} else {
    console.log('Markers not found');
}
