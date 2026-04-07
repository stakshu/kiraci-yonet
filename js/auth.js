/* ── KiracıYönet — Auth Modülü (Faz 1) ── */

/* ── Auth sekme gecisi ── */
function switchAuthTab(tab) {
  clearAuthMsg();
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authFooter = document.getElementById('authFooter');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authTitle.textContent = 'Giris Yap';
    authSubtitle.textContent = 'Hesabiniza giris yaparak devam edin';
    authFooter.innerHTML = 'Hesabiniz yok mu? <a href="#" onclick="switchAuthTab(\'register\'); return false;" style="color:#3B82F6;font-weight:600;text-decoration:none;">Kayit olun</a>';
  } else {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.textContent = 'Kayit Ol';
    authSubtitle.textContent = 'Yeni bir hesap olusturun';
    authFooter.innerHTML = 'Zaten hesabiniz var mi? <a href="#" onclick="switchAuthTab(\'login\'); return false;" style="color:#3B82F6;font-weight:600;text-decoration:none;">Giris yapin</a>';
  }
}

/* ── Auth mesaj gosterimi ── */
function showAuthMsg(msg, type = 'error') {
  const authMessage = document.getElementById('authMessage');
  authMessage.textContent = msg;
  authMessage.className = 'auth-message ' + type;
}

function clearAuthMsg() {
  const authMessage = document.getElementById('authMessage');
  authMessage.className = 'auth-message';
  authMessage.textContent = '';
}

/* ── Giris yapildiginda UI guncelle ── */
function onUserLoggedIn(user) {
  const authOverlay = document.getElementById('authOverlay');
  const userInfo = document.getElementById('userInfo');
  const userEmail = document.getElementById('userEmail');
  const sbUserName = document.querySelector('.sb-user-name');
  const sbUserBadge = document.querySelector('.sb-user-badge');

  authOverlay.classList.add('hidden');
  userInfo.style.display = 'flex';
  userEmail.textContent = user.email;

  if (sbUserName) sbUserName.textContent = user.email.split('@')[0];
  if (sbUserBadge) sbUserBadge.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Cevrimici';

  console.log('[KiraciYonet] Kullanici giris yapti:', user.email);
}

/* ── Cikis yapildiginda UI guncelle ── */
function onUserLoggedOut() {
  const authOverlay = document.getElementById('authOverlay');
  const userInfo = document.getElementById('userInfo');
  const userEmail = document.getElementById('userEmail');
  const sbUserName = document.querySelector('.sb-user-name');
  const sbUserBadge = document.querySelector('.sb-user-badge');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  authOverlay.classList.remove('hidden');
  userInfo.style.display = 'none';
  userEmail.textContent = '';

  if (sbUserName) sbUserName.textContent = 'Kullanici';
  if (sbUserBadge) sbUserBadge.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Giris yapilmadi';

  loginForm.reset();
  registerForm.reset();
  clearAuthMsg();
  switchAuthTab('login');
}

/* ── Giris islemi ── */
async function handleLogin(e) {
  e.preventDefault();
  clearAuthMsg();

  if (!supabaseClient) {
    showAuthMsg('Supabase baglantisi kurulamadi. Lutfen yapilandirmayi kontrol edin.');
    return;
  }

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.textContent = 'Giris yapiliyor...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      const msgs = {
        'Invalid login credentials': 'E-posta veya sifre hatali.',
        'Email not confirmed': 'E-posta adresiniz henuz dogrulanmadi.',
      };
      showAuthMsg(msgs[error.message] || error.message);
    } else {
      showToast('Basariyla giris yapildi!');
    }
  } catch (err) {
    showAuthMsg('Bir hata olustu: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giris Yap';
  }
}

/* ── Kayit islemi ── */
async function handleRegister(e) {
  e.preventDefault();
  clearAuthMsg();

  if (!supabaseClient) {
    showAuthMsg('Supabase baglantisi kurulamadi. Lutfen yapilandirmayi kontrol edin.');
    return;
  }

  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;
  const btn = document.getElementById('regBtn');

  if (password !== passwordConfirm) {
    showAuthMsg('Sifreler eslesmiyor.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Kayit yapiliyor...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      const msgs = {
        'User already registered': 'Bu e-posta adresi zaten kayitli.',
        'Password should be at least 6 characters': 'Sifre en az 6 karakter olmalidir.',
      };
      showAuthMsg(msgs[error.message] || error.message);
    } else if (data.user && !data.session) {
      showAuthMsg('Kayit basarili! Lutfen e-posta adresinizi dogrulayin.', 'success');
      switchAuthTab('login');
    } else {
      showToast('Kayit basarili! Hos geldiniz.');
    }
  } catch (err) {
    showAuthMsg('Bir hata olustu: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kayit Ol';
  }
}

/* ── Cikis islemi ── */
async function handleLogout() {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showToast('Cikis hatasi: ' + error.message, 'error');
    } else {
      showToast('Basariyla cikis yapildi.');
    }
  } catch (err) {
    showToast('Cikis hatasi: ' + err.message, 'error');
  }
}
