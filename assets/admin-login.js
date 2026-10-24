import {
  getClient,
  onlineEnabled,
  requireAdmin,
  readOnlineState,
} from './online-store.js';

export async function startLogin(onLogout) {
  const panel = document.querySelector('#login-panel');
  const login = document.querySelector('#login-form');
  const recovery = document.querySelector('#password-form');
  const status = document.querySelector('#login-status');
  const session = document.querySelector('#session-bar');
  panel.hidden = false;
  const say = (text) => {
    status.textContent = text;
  };
  if (!onlineEnabled) {
    login.querySelectorAll('input,button').forEach((e) => (e.disabled = true));
    document.querySelector('#forgot-password').disabled = true;
    say(
      'O acesso online ainda não está ativado. Falta configurar a ligação ao serviço de contas.',
    );

    throw Error(
      'Configuração online pendente. Os conteúdos existentes continuam disponíveis no site.',
    );
  }
  let recovering = /(?:type=recovery|type=invite)/.test(location.hash);
  const client = await getClient();
  let resolveReady,
    unlocked = false,
    checking = false;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const unlock = async () => {
    if (checking || recovering) return;
    checking = true;
    try {
      const user = await requireAdmin(client);
      const state = unlocked ? null : await readOnlineState(client);
      panel.hidden = true;
      session.hidden = false;
      document.querySelector('#session-email').textContent = user.email;
      document.querySelector('#editor').hidden = false;
      if (!unlocked) {
        unlocked = true;
        resolveReady({ client, state });
      }
      document.querySelector('#connection').textContent =
        'Sessão iniciada. Publica quando terminares as alterações.';
    } catch (error) {
      panel.hidden = false;
      document.querySelector('#editor').hidden = true;
      say(error.message);
    } finally {
      checking = false;
    }
  };
  const showRecovery = () => {
    recovering = true;
    panel.hidden = false;
    login.hidden = true;
    recovery.hidden = false;
    document.querySelector('#forgot-password').hidden = true;
    document.querySelector('#editor').hidden = true;
    say('Define uma palavra-passe com pelo menos 12 caracteres.');
  };
  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') showRecovery();
    if (event === 'SIGNED_OUT') {
      panel.hidden = false;
      session.hidden = true;
      document.querySelector('#editor').hidden = true;
      say('Sessão terminada. Inicia sessão para continuar.');
    }
    if (event === 'SIGNED_IN' && !recovering) setTimeout(unlock, 0);
  });
  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = login.querySelector('button');
    button.disabled = true;
    say('A iniciar sessão…');
    try {
      const result = await client.auth.signInWithPassword({
        email: login.elements.email.value.trim(),
        password: login.elements.password.value,
      });
      login.elements.password.value = '';
      if (result.error)
        throw Error('Não foi possível entrar. Confirma o email e a palavra-passe.');
      await unlock();
    } catch (error) {
      say(error.message);
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector('#forgot-password').onclick = async () => {
    if (!login.elements.email.reportValidity()) return;
    const button = document.querySelector('#forgot-password');
    button.disabled = true;
    try {
      const redirectTo = new URL('./', location.href);
      redirectTo.search = '';
      redirectTo.hash = '';
      const { error } = await client.auth.resetPasswordForEmail(
        login.elements.email.value.trim(),
        { redirectTo: redirectTo.href },
      );
      if (error)
        throw Error('Não foi possível enviar o pedido. Tenta novamente mais tarde.');
      say(
        'Se existir uma conta com esse email, receberás uma ligação para definir a palavra-passe.',
      );
    } catch (error) {
      say(error.message);
    } finally {
      button.disabled = false;
    }
  };
  recovery.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = recovery.querySelector('button');
    button.disabled = true;
    try {
      if (recovery.elements.password.value !== recovery.elements.confirm.value)
        throw Error('As palavras-passe não coincidem.');
      const { error } = await client.auth.updateUser({
        password: recovery.elements.password.value,
      });
      if (error)
        throw Error(
          'Não foi possível alterar a palavra-passe. Pede uma nova ligação e tenta novamente.',
        );
      recovery.reset();
      recovering = false;
      recovery.hidden = true;
      login.hidden = false;
      document.querySelector('#forgot-password').hidden = false;
      history.replaceState(null, '', location.pathname);
      await unlock();
    } catch (error) {
      say(error.message);
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector('#sign-out').onclick = async () => {
    if (!onLogout()) return;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      say('Não foi possível terminar a sessão. Tenta novamente.');
      panel.hidden = false;
      return;
    }
    onLogout(true);
    location.reload();
  };
  if (recovering) showRecovery();
  const { data } = await client.auth.getSession();
  if (data.session && !recovering) await unlock();
  else if (!recovering) say('Entra com a tua conta de administrador.');
  return ready;
}
