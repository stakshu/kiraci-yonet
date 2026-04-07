/* ── KiraciYonet — Ana Uygulama (Faz 0-2) ── */

/* ── DOM yardimcilari ── */
const $ = (id) => document.getElementById(id);

/* ── Sayfa cache (ayni sayfayi tekrar fetch etmesin) ── */
const pageCache = {};
let currentPage = null;

/* ── Sidebar collapse ── */
document.getElementById('collapseBtn').addEventListener('click', () => {
  document.body.classList.toggle('collapsed');
});

/* ── Nav group toggle ── */
function toggleGroup(el) {
  const group = el.closest('.nav-group');
  if (group) group.classList.toggle('open');
}

/* ── SPA Sayfa Gecisi — fetch ile dinamik yukleme ── */
async function showPage(pageId, title, clickedEl) {
  const pageContent = $('pageContent');
  const pageTitle = $('pageTitle');

  /* Topbar basligini guncelle */
  if (pageTitle) pageTitle.textContent = title;

  /* Sidebar aktif durumunu guncelle */
  if (clickedEl) {
    document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));
    clickedEl.classList.add('active');

    if (clickedEl.classList.contains('nav-sub-item')) {
      const parentGroup = clickedEl.closest('.nav-group');
      if (parentGroup) {
        const parentItem = parentGroup.querySelector('.nav-item');
        if (parentItem) parentItem.classList.add('active');
      }
    }
  }

  /* Ayni sayfa tekrar tiklandiysa bir sey yapma */
  if (currentPage === pageId) return;
  currentPage = pageId;

  /* Sayfa icerigi yukle */
  try {
    let html;
    if (pageCache[pageId]) {
      html = pageCache[pageId];
    } else {
      const res = await fetch('pages/' + pageId + '.html');
      if (!res.ok) throw new Error('Sayfa bulunamadi: ' + pageId);
      html = await res.text();
      pageCache[pageId] = html;
    }

    /* Animasyon icin once gizle, sonra goster */
    pageContent.style.animation = 'none';
    pageContent.innerHTML = html;
    void pageContent.offsetWidth;
    pageContent.style.animation = '';

    /* Daireler sayfasi yuklendiginde Supabase banner'i guncelle */
    if (pageId === 'daireler' && supabaseClient) {
      updateConnBanner();
    }

    console.log('[KiraciYonet] Sayfa:', pageId, '—', title);
  } catch (err) {
    pageContent.innerHTML = '<div class="empty-state"><h3 class="empty-state-title">Sayfa yuklenemedi</h3><p class="empty-state-desc">' + err.message + '</p></div>';
    console.error('[KiraciYonet] Sayfa yukleme hatasi:', err);
  }
}

/* ── Toast bildirimi ── */
function showToast(message, type = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/* ── Connection banner guncelle ── */
function updateConnBanner() {
  const banner = $('connBanner');
  const icon   = $('connIcon');
  const text   = $('connText');
  if (!banner) return;

  if (supabaseClient && supabaseClient.auth) {
    banner.className = 'conn-banner ok';
    icon.textContent = '\u2713';
    text.textContent = 'Supabase baglantisi basariyla kuruldu.';
  }
}

/* ── Supabase baslat + Auth dinle ── */
function initSupabase() {
  /* Yapilandirma kontrolu */
  if (SUPABASE_CONFIG.url.includes('PROJENIZ') || SUPABASE_CONFIG.anonKey.includes('ANON_KEY')) {
    console.warn('[KiraciYonet] Supabase yapilandirmasi eksik.');
    return;
  }

  /* SDK yuklu mu kontrol et */
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[KiraciYonet] Supabase SDK yuklenemedi!');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('[KiraciYonet] Supabase client olusturuldu:', supabaseClient);

    if (!supabaseClient || !supabaseClient.auth) {
      throw new Error('Supabase client baslatilamadi — API key formatini kontrol edin.');
    }

    console.log('[KiraciYonet] Supabase hazir.');

    /* Auth durum degisikliklerini dinle */
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('[KiraciYonet] Auth event:', event);
      if (session?.user) {
        onUserLoggedIn(session.user);
      } else {
        onUserLoggedOut();
      }
    });

    /* Mevcut oturumu kontrol et */
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        onUserLoggedIn(session.user);
      } else {
        onUserLoggedOut();
      }
    });

  } catch(e) {
    console.error('[KiraciYonet] Supabase hata:', e);
  }
}

/* ── Uygulama baslatma ── */
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  /* Varsayilan sayfa: daireler */
  showPage('daireler', 'Daireler', document.querySelector('[data-page="daireler"]'));
});
