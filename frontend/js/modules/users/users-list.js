// Logique de gestion des utilisateurs (dashboard admin)
let currentUsers = [];

async function loadUsers() {
    const container = document.getElementById('usersTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="6">Chargement...</td></tr>';
    
    const result = await UsersAPI.getAll();
    
    if (result.ok && result.data) {
        currentUsers = result.data;
        displayUsers(currentUsers);
    } else {
        container.innerHTML = '<tr><td colspan="6">Erreur de chargement</td></tr>';
    }
}

function displayUsers(users) {
    const container = document.getElementById('usersTableBody');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="6">Aucun utilisateur</td></tr>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.nom)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-acheteur'}">${user.role}</span></td>
            <td>${user.actif ? '✅ Actif' : '❌ Inactif'}</td>
            <td>
                <button onclick="editUser(${user.id})" class="btn-edit">✏️</button>
                <button onclick="deleteUser(${user.id})" class="btn-delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function deleteUser(id) {
    const user = currentUsers.find(u => u.id === id);
    if (!user) return;
    
    if (confirm(`Supprimer "${user.nom}" ?`)) {
        const result = await UsersAPI.delete(id);
        if (result.ok) {
            await loadUsers();
            alert('Utilisateur supprimé');
        } else {
            alert('Erreur: ' + (result.data?.detail || 'Suppression impossible'));
        }
    }
}

async function editUser(id) {
    const user = currentUsers.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('userId').value = user.id;
    document.getElementById('userNom').value = user.nom;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userActif').checked = user.actif;
    document.getElementById('userPassword').value = '';
    
    document.getElementById('userFormTitle').textContent = 'Modifier un utilisateur';
    document.getElementById('userForm').style.display = 'block';
}

async function saveUser() {
    const id = document.getElementById('userId').value;
    const nom = document.getElementById('userNom').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const actif = document.getElementById('userActif').checked;
    const mot_de_passe = document.getElementById('userPassword').value;
    
    const userData = { nom, email, role, actif };
    if (mot_de_passe) userData.mot_de_passe = mot_de_passe;
    
    let result;
    if (id) {
        result = await UsersAPI.update(id, userData);
    } else {
        if (!mot_de_passe) {
            alert('Le mot de passe est requis pour un nouvel utilisateur');
            return;
        }
        result = await UsersAPI.create(userData);
    }
    
    if (result.ok) {
        document.getElementById('userForm').style.display = 'none';
        document.getElementById('userId').value = '';
        document.getElementById('userPassword').value = '';
        await loadUsers();
        alert(id ? 'Utilisateur modifié' : 'Utilisateur créé');
    } else {
        alert('Erreur: ' + (result.data?.detail || 'Opération impossible'));
    }
}

function showAddUserForm() {
    document.getElementById('userId').value = '';
    document.getElementById('userNom').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userRole').value = 'acheteur';
    document.getElementById('userActif').checked = true;
    document.getElementById('userPassword').value = '';
    
    document.getElementById('userFormTitle').textContent = 'Ajouter un utilisateur';
    document.getElementById('userForm').style.display = 'block';
}

function cancelUserForm() {
    document.getElementById('userForm').style.display = 'none';
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').value = '';
}

// Charger les utilisateurs au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('usersTableBody')) {
        loadUsers();
    }
});