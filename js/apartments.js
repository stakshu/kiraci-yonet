/* ── KiraciYonet — Faz 3: Daire CRUD ── */

/* ── Daire listesini cek ve tabloya bas ── */
async function loadApartments() {
  const tbody = document.getElementById('tableBody');
  if (!tbody || !supabaseClient) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Yukleniyor...</td></tr>';

  const { data, error } = await supabaseClient
    .from('apartments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Apartments] Liste hatasi:', error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--red)">Hata: ' + error.message + '</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Henuz daire eklenmemis. "Yeni Ekle" butonuna tiklayin.</td></tr>';
    updateStats(0, 0, 0);
    return;
  }

  /* Istatistikleri guncelle */
  const occupied = data.filter(d => d.status === 'occupied').length;
  const vacant   = data.filter(d => d.status === 'vacant').length;
  const expiring = data.filter(d => d.status === 'expiring').length;
  updateStats(data.length, occupied, vacant);

  /* Tabloyu doldur */
  tbody.innerHTML = data.map(apt => {
    const statusMap = {
      occupied: { label: 'Dolu',         css: 'active'  },
      vacant:   { label: 'Bos',          css: 'inactive' },
      expiring: { label: 'Sure Doluyor', css: 'pending' }
    };
    const st = statusMap[apt.status] || statusMap.vacant;
    const rent = apt.rent ? Number(apt.rent).toLocaleString('tr-TR') : '—';
    const leaseEnd = apt.lease_end ? formatDate(apt.lease_end) : '—';
    const tenant = apt.tenant_name || '—';

    return '<tr>' +
      '<td class="td-check"><input type="checkbox" data-id="' + apt.id + '" /></td>' +
      '<td><div class="tenant-cell"><span class="tenant-name">' + esc(apt.building) + '</span><span class="tenant-email">' + esc(apt.district) + ', ' + esc(apt.city) + '</span></div></td>' +
      '<td class="td-id">' + esc(apt.unit_no) + '</td>' +
      '<td>' + esc(tenant) + '</td>' +
      '<td>' + rent + '</td>' +
      '<td>' + leaseEnd + '</td>' +
      '<td><span class="status-badge ' + st.css + '">' + st.label + '</span></td>' +
      '<td class="td-actions"><div class="action-menu">' +
        '<button class="action-menu-btn" onclick="toggleActionMenu(this)"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg></button>' +
        '<div class="action-dropdown">' +
          '<button onclick="editApartment(\'' + apt.id + '\')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Duzenle</button>' +
          '<button onclick="deleteApartment(\'' + apt.id + '\', \'' + esc(apt.building) + ' ' + esc(apt.unit_no) + '\')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Sil</button>' +
        '</div>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}

/* ── Istatistik kartlarini guncelle ── */
function updateStats(total, occupied, vacant) {
  const elTotal    = document.getElementById('statDaire');
  const elOccupied = document.getElementById('statKiraci');
  const elVacant   = document.getElementById('statBos');
  if (elTotal)    elTotal.textContent    = total;
  if (elOccupied) elOccupied.textContent = occupied;
  if (elVacant)   elVacant.textContent   = vacant;
}

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
  const d = new Date(dateStr);
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

/* ── HTML escape ── */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Action menu toggle ── */
function toggleActionMenu(btn) {
  /* Diger acik menuleri kapat */
  document.querySelectorAll('.action-dropdown.show').forEach(d => {
    if (d !== btn.nextElementSibling) d.classList.remove('show');
  });
  btn.nextElementSibling.classList.toggle('show');
}

/* Sayfa tiklandiginda action menu kapat */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-menu')) {
    document.querySelectorAll('.action-dropdown.show').forEach(d => d.classList.remove('show'));
  }
});

/* ── Modal ac/kapat ── */
function openApartmentModal(mode, data) {
  const modal   = document.getElementById('aptModal');
  const title   = document.getElementById('aptModalTitle');
  const form    = document.getElementById('aptForm');
  const idField = document.getElementById('aptId');
  if (!modal) return;

  form.reset();
  idField.value = '';

  if (mode === 'edit' && data) {
    title.textContent = 'Daire Duzenle';
    idField.value              = data.id;
    document.getElementById('aptBuilding').value   = data.building || '';
    document.getElementById('aptUnitNo').value      = data.unit_no || '';
    document.getElementById('aptCity').value         = data.city || '';
    document.getElementById('aptDistrict').value     = data.district || '';
    document.getElementById('aptTenant').value       = data.tenant_name || '';
    document.getElementById('aptRent').value         = data.rent || '';
    document.getElementById('aptLeaseEnd').value     = data.lease_end || '';
    document.getElementById('aptStatus').value       = data.status || 'vacant';
    document.getElementById('aptNotes').value        = data.notes || '';
  } else {
    title.textContent = 'Yeni Daire Ekle';
  }

  modal.classList.add('show');
}

function closeApartmentModal() {
  const modal = document.getElementById('aptModal');
  if (modal) modal.classList.remove('show');
}

/* ── Daire kaydet (ekle veya guncelle) ── */
async function saveApartment(e) {
  e.preventDefault();

  const id = document.getElementById('aptId').value;
  const saveBtn = document.getElementById('aptSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Kaydediliyor...';

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Oturum suresi dolmus. Lutfen tekrar giris yapin.', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Kaydet';
    return;
  }

  const record = {
    user_id:     session.user.id,
    building:    document.getElementById('aptBuilding').value.trim(),
    unit_no:     document.getElementById('aptUnitNo').value.trim(),
    city:        document.getElementById('aptCity').value.trim(),
    district:    document.getElementById('aptDistrict').value.trim(),
    tenant_name: document.getElementById('aptTenant').value.trim(),
    rent:        parseFloat(document.getElementById('aptRent').value) || 0,
    lease_end:   document.getElementById('aptLeaseEnd').value || null,
    status:      document.getElementById('aptStatus').value,
    notes:       document.getElementById('aptNotes').value.trim()
  };

  let result;
  if (id) {
    /* Guncelle */
    result = await supabaseClient.from('apartments').update(record).eq('id', id);
  } else {
    /* Yeni ekle */
    result = await supabaseClient.from('apartments').insert(record);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Kaydet';

  if (result.error) {
    console.error('[Apartments] Kayit hatasi:', result.error);
    showToast('Hata: ' + result.error.message, 'error');
    return;
  }

  showToast(id ? 'Daire guncellendi.' : 'Daire eklendi.', 'success');
  closeApartmentModal();
  loadApartments();
}

/* ── Daire duzenle ── */
async function editApartment(id) {
  document.querySelectorAll('.action-dropdown.show').forEach(d => d.classList.remove('show'));

  const { data, error } = await supabaseClient
    .from('apartments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    showToast('Daire bulunamadi.', 'error');
    return;
  }

  openApartmentModal('edit', data);
}

/* ── Daire sil ── */
async function deleteApartment(id, name) {
  document.querySelectorAll('.action-dropdown.show').forEach(d => d.classList.remove('show'));

  if (!confirm(name + ' silinsin mi? Bu islem geri alinamaz.')) return;

  const { error } = await supabaseClient
    .from('apartments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Apartments] Silme hatasi:', error);
    showToast('Silme hatasi: ' + error.message, 'error');
    return;
  }

  showToast('Daire silindi.', 'success');
  loadApartments();
}
