/* ── KiraciYonet — Ana Uygulama (History API Router) ── */

/* ── DOM yardimcilari ── */
const $ = (id) => document.getElementById(id);

/* ── Sayfa cache ── */
const pageCache = {};
let currentRoute = null;

/* ── Route Tablosu ── */
/* path → { file: pages/ altindaki HTML dosyasi, title: Turkce baslik, parent: sidebar grubu } */
const ROUTES = {
  '/':                        { file: 'apartments-list',       title: 'Daire Listesi',     parent: 'apartments' },
  '/apartments/list':         { file: 'apartments-list',       title: 'Daire Listesi',     parent: 'apartments' },
  '/apartments/buildings':    { file: 'apartments-buildings',  title: 'Bina Yonetimi',     parent: 'apartments' },
  '/tenants/list':            { file: 'tenants-list',          title: 'Kiraci Listesi',    parent: 'tenants' },
  '/tenants/contracts':       { file: 'tenants-contracts',     title: 'Sozlesmeler',       parent: 'tenants' },
  '/tenants/evictions':       { file: 'tenants-evictions',     title: 'Tahliye Takibi',    parent: 'tenants' },
  '/payments/rent':           { file: 'payments-rent',         title: 'Kira Odemeleri',    parent: 'payments' },
  '/payments/overdue':        { file: 'payments-overdue',      title: 'Geciken Odemeler',  parent: 'payments' },
  '/payments/history':        { file: 'payments-history',      title: 'Odeme Gecmisi',     parent: 'payments' },
  '/expenses':                { file: 'expenses',              title: 'Giderler',          parent: null },
  '/accounting':              { file: 'accounting',            title: 'Muhasebe',          parent: null },
  '/documents':               { file: 'documents',             title: 'Belgeler',          parent: null },
  '/settings':                { file: 'settings',              title: 'Ayarlar',           parent: null }
};

/* ── Sidebar collapse ── */
document.getElementById('collapseBtn').addEventListener('click', () => {
  document.body.classList.toggle('collapsed');
});

/* ── Nav group toggle ── */
function toggleGroup(el) {
  const group = el.closest('.nav-group');
  if (group) group.classList.toggle('open');
}

/* ── Sidebar aktif durumunu guncelle ── */
function updateSidebarActive(route) {
  document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));

  /* data-route ile eslesen ogeyi bul */
  const subItem = document.querySelector('.nav-sub-item[data-route="' + route + '"]');
  if (subItem) {
    subItem.classList.add('active');
    const parentGroup = subItem.closest('.nav-group');
    if (parentGroup) {
      parentGroup.classList.add('open');
      const parentItem = parentGroup.querySelector('.nav-item');
      if (parentItem) parentItem.classList.add('active');
    }
    return;
  }

  const navItem = document.querySelector('.nav-item[data-route="' + route + '"]');
  if (navItem) navItem.classList.add('active');
}

/* ── Navigate — ana yonlendirme fonksiyonu ── */
async function navigate(route, pushState = true) {
  const routeInfo = ROUTES[route];
  if (!routeInfo) {
    /* Bilinmeyen route → ana sayfaya yonlendir */
    navigate('/apartments/list', true);
    return;
  }

  /* Ayni route tekrar tiklandiysa bir sey yapma */
  if (currentRoute === route) return;
  currentRoute = route;

  const pageContent = $('pageContent');
  const pageTitle = $('pageTitle');

  /* Baslik guncelle */
  if (pageTitle) pageTitle.textContent = routeInfo.title;

  /* Sidebar guncelle */
  updateSidebarActive(route);

  /* URL guncelle */
  if (pushState && window.location.pathname !== route) {
    history.pushState({ route: route }, '', route);
  }

  /* Sayfa icerigi yukle */
  try {
    let html;
    const file = routeInfo.file;
    if (pageCache[file]) {
      html = pageCache[file];
    } else {
      const res = await fetch('/pages/' + file + '.html');
      if (!res.ok) throw new Error('Sayfa bulunamadi: ' + file);
      html = await res.text();
      pageCache[file] = html;
    }

    pageContent.style.animation = 'none';
    pageContent.innerHTML = html;
    void pageContent.offsetWidth;
    pageContent.style.animation = '';

    /* Daireler sayfasinda Supabase banner guncelle */
    if (file === 'apartments-list' && supabaseClient) {
      updateConnBanner();
    }

    console.log('[KiraciYonet] Route:', route, '—', routeInfo.title);
  } catch (err) {
    pageContent.innerHTML = '<div class="empty-state"><h3 class="empty-state-title">Sayfa yuklenemedi</h3><p class="empty-state-desc">' + err.message + '</p></div>';
    console.error('[KiraciYonet] Sayfa yukleme hatasi:', err);
  }
}

/* ── Eski showPage fonksiyonunu kaldir, navigate kullan ── */
/* Sidebar onclick'lerinden cagrilan wrapper */
function goTo(route, el) {
  /* Eger bir nav-group icindeki parent item tiklandiysa, sadece toggle yap */
  if (el && el.classList.contains('nav-item') && el.closest('.nav-group') && el.querySelector('.nav-group-arrow')) {
    toggleGroup(el);
    return;
  }
  navigate(route);
}

/* ── Tarayici geri/ileri butonlari ── */
window.addEventListener('popstate', (e) => {
  const route = window.location.pathname || '/';
  currentRoute = null; /* force reload */
  navigate(route, false);
});

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
  if (SUPABASE_CONFIG.url.includes('PROJENIZ') || SUPABASE_CONFIG.anonKey.includes('ANON_KEY')) {
    console.warn('[KiraciYonet] Supabase yapilandirmasi eksik.');
    return;
  }

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

    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('[KiraciYonet] Auth event:', event);
      if (session?.user) {
        onUserLoggedIn(session.user);
      } else {
        onUserLoggedOut();
      }
    });

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

  /* URL path'inden route belirle */
  const path = window.location.pathname || '/';
  const startRoute = ROUTES[path] ? path : '/apartments/list';
  navigate(startRoute, startRoute !== path);
});
