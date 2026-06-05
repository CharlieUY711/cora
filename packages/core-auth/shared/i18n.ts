// ═══════════════════════════════════════════════════════════════
// @core/auth — Traducciones completas
// Cubre: login, registro, verificación, recuperación, cambio de pass
// ═══════════════════════════════════════════════════════════════

export const locales = ['es', 'en', 'pt'] as const
export type Locale = typeof locales[number]

const t = {
  es: {
    // ── Login ─────────────────────────────────────────────
    login_title:           'Acceso',
    login_subtitle:        'Ingresá con tu cuenta.',
    login_email:           'Correo electrónico',
    login_password:        'Contraseña',
    login_btn:             'Ingresar',
    login_loading:         'Verificando...',
    login_forgot:          'Olvidé mi contraseña',
    login_no_account:      '¿No tenés cuenta?',
    login_register_link:   'Registrate',
    login_err_invalid:     'Credenciales incorrectas.',
    login_err_generic:     'Error al iniciar sesión. Intentá de nuevo.',

    // ── Registro ──────────────────────────────────────────
    register_title:        'Crear cuenta',
    register_subtitle:     'Completá tus datos para registrarte.',
    register_name:         'Nombre completo',
    register_email:        'Correo electrónico',
    register_password:     'Contraseña',
    register_confirm:      'Confirmar contraseña',
    register_btn:          'Crear cuenta',
    register_loading:      'Creando cuenta...',
    register_has_account:  '¿Ya tenés cuenta?',
    register_login_link:   'Ingresá',
    register_err_match:    'Las contraseñas no coinciden.',
    register_err_short:    'La contraseña debe tener al menos 6 caracteres.',
    register_err_generic:  'Error al registrarse. Intentá de nuevo.',
    register_success:      '¡Cuenta creada! Revisá tu email para confirmar.',

    // ── Verificación de email ─────────────────────────────
    verify_title:          'Verificá tu email',
    verify_subtitle:       'Te enviamos un link de confirmación a',
    verify_resend:         'Reenviar email',
    verify_resend_loading: 'Reenviando...',
    verify_resend_ok:      'Email reenviado.',
    verify_back_login:     'Volver al login',

    // ── Recuperar contraseña ──────────────────────────────
    forgot_title:          'Recuperar contraseña',
    forgot_subtitle:       'Ingresá tu email y te enviamos un link.',
    forgot_email:          'Correo electrónico',
    forgot_btn:            'Enviar link',
    forgot_loading:        'Enviando...',
    forgot_success:        'Te enviamos un email para recuperar tu contraseña.',
    forgot_back:           'Volver al login',
    forgot_err_generic:    'Error al enviar el email. Intentá de nuevo.',

    // ── Nueva contraseña (reset) ──────────────────────────
    reset_title:           'Nueva contraseña',
    reset_subtitle:        'Ingresá tu nueva contraseña.',
    reset_password:        'Nueva contraseña',
    reset_confirm:         'Confirmar contraseña',
    reset_btn:             'Guardar contraseña',
    reset_loading:         'Guardando...',
    reset_success:         '¡Contraseña actualizada! Ya podés ingresar.',
    reset_err_match:       'Las contraseñas no coinciden.',
    reset_err_short:       'La contraseña debe tener al menos 6 caracteres.',
    reset_err_generic:     'Error al actualizar la contraseña.',

    // ── Cambio de contraseña (usuario logueado) ───────────
    change_title:          'Cambiar contraseña',
    change_current:        'Contraseña actual',
    change_new:            'Nueva contraseña',
    change_confirm:        'Confirmar nueva contraseña',
    change_btn:            'Actualizar',
    change_loading:        'Actualizando...',
    change_success:        'Contraseña actualizada correctamente.',
    change_err_match:      'Las contraseñas no coinciden.',
    change_err_generic:    'Error al cambiar la contraseña.',

    // ── Compartidos ───────────────────────────────────────
    show_password:         'Mostrar contraseña',
    hide_password:         'Ocultar contraseña',
    restricted:            'Acceso restringido · Solo personal autorizado',
    confidential:          'Confidencial — Uso interno',
    tagline:               'Global Supply. Regional Growth.',
  },

  en: {
    login_title:           'Sign in',
    login_subtitle:        'Sign in to your account.',
    login_email:           'Email address',
    login_password:        'Password',
    login_btn:             'Sign in',
    login_loading:         'Verifying...',
    login_forgot:          'Forgot password',
    login_no_account:      "Don't have an account?",
    login_register_link:   'Sign up',
    login_err_invalid:     'Invalid credentials.',
    login_err_generic:     'Sign in error. Please try again.',

    register_title:        'Create account',
    register_subtitle:     'Fill in your details to register.',
    register_name:         'Full name',
    register_email:        'Email address',
    register_password:     'Password',
    register_confirm:      'Confirm password',
    register_btn:          'Create account',
    register_loading:      'Creating account...',
    register_has_account:  'Already have an account?',
    register_login_link:   'Sign in',
    register_err_match:    "Passwords don't match.",
    register_err_short:    'Password must be at least 6 characters.',
    register_err_generic:  'Registration error. Please try again.',
    register_success:      'Account created! Check your email to confirm.',

    verify_title:          'Verify your email',
    verify_subtitle:       'We sent a confirmation link to',
    verify_resend:         'Resend email',
    verify_resend_loading: 'Resending...',
    verify_resend_ok:      'Email resent.',
    verify_back_login:     'Back to login',

    forgot_title:          'Reset password',
    forgot_subtitle:       'Enter your email and we\'ll send you a link.',
    forgot_email:          'Email address',
    forgot_btn:            'Send link',
    forgot_loading:        'Sending...',
    forgot_success:        'We sent you an email to reset your password.',
    forgot_back:           'Back to login',
    forgot_err_generic:    'Error sending email. Please try again.',

    reset_title:           'New password',
    reset_subtitle:        'Enter your new password.',
    reset_password:        'New password',
    reset_confirm:         'Confirm password',
    reset_btn:             'Save password',
    reset_loading:         'Saving...',
    reset_success:         'Password updated! You can now sign in.',
    reset_err_match:       "Passwords don't match.",
    reset_err_short:       'Password must be at least 6 characters.',
    reset_err_generic:     'Error updating password.',

    change_title:          'Change password',
    change_current:        'Current password',
    change_new:            'New password',
    change_confirm:        'Confirm new password',
    change_btn:            'Update',
    change_loading:        'Updating...',
    change_success:        'Password updated successfully.',
    change_err_match:      "Passwords don't match.",
    change_err_generic:    'Error changing password.',

    show_password:         'Show password',
    hide_password:         'Hide password',
    restricted:            'Restricted access · Authorized personnel only',
    confidential:          'Confidential — Internal use',
    tagline:               'Global Supply. Regional Growth.',
  },

  pt: {
    login_title:           'Entrar',
    login_subtitle:        'Entre com sua conta.',
    login_email:           'Endereço de e-mail',
    login_password:        'Senha',
    login_btn:             'Entrar',
    login_loading:         'Verificando...',
    login_forgot:          'Esqueci minha senha',
    login_no_account:      'Não tem uma conta?',
    login_register_link:   'Cadastre-se',
    login_err_invalid:     'Credenciais incorretas.',
    login_err_generic:     'Erro ao entrar. Tente novamente.',

    register_title:        'Criar conta',
    register_subtitle:     'Preencha seus dados para se cadastrar.',
    register_name:         'Nome completo',
    register_email:        'Endereço de e-mail',
    register_password:     'Senha',
    register_confirm:      'Confirmar senha',
    register_btn:          'Criar conta',
    register_loading:      'Criando conta...',
    register_has_account:  'Já tem uma conta?',
    register_login_link:   'Entre',
    register_err_match:    'As senhas não coincidem.',
    register_err_short:    'A senha deve ter pelo menos 6 caracteres.',
    register_err_generic:  'Erro ao cadastrar. Tente novamente.',
    register_success:      'Conta criada! Verifique seu e-mail para confirmar.',

    verify_title:          'Verifique seu e-mail',
    verify_subtitle:       'Enviamos um link de confirmação para',
    verify_resend:         'Reenviar e-mail',
    verify_resend_loading: 'Reenviando...',
    verify_resend_ok:      'E-mail reenviado.',
    verify_back_login:     'Voltar ao login',

    forgot_title:          'Recuperar senha',
    forgot_subtitle:       'Digite seu e-mail e enviaremos um link.',
    forgot_email:          'Endereço de e-mail',
    forgot_btn:            'Enviar link',
    forgot_loading:        'Enviando...',
    forgot_success:        'Enviamos um e-mail para recuperar sua senha.',
    forgot_back:           'Voltar ao login',
    forgot_err_generic:    'Erro ao enviar o e-mail. Tente novamente.',

    reset_title:           'Nova senha',
    reset_subtitle:        'Digite sua nova senha.',
    reset_password:        'Nova senha',
    reset_confirm:         'Confirmar senha',
    reset_btn:             'Salvar senha',
    reset_loading:         'Salvando...',
    reset_success:         'Senha atualizada! Agora você pode entrar.',
    reset_err_match:       'As senhas não coincidem.',
    reset_err_short:       'A senha deve ter pelo menos 6 caracteres.',
    reset_err_generic:     'Erro ao atualizar a senha.',

    change_title:          'Alterar senha',
    change_current:        'Senha atual',
    change_new:            'Nova senha',
    change_confirm:        'Confirmar nova senha',
    change_btn:            'Atualizar',
    change_loading:        'Atualizando...',
    change_success:        'Senha atualizada com sucesso.',
    change_err_match:      'As senhas não coincidem.',
    change_err_generic:    'Erro ao alterar a senha.',

    show_password:         'Mostrar senha',
    hide_password:         'Ocultar senha',
    restricted:            'Acesso restrito · Somente pessoal autorizado',
    confidential:          'Confidencial — Uso interno',
    tagline:               'Global Supply. Regional Growth.',
  },
} as const

export type TranslationKey = keyof typeof t['es']

export function useAuthT(locale: Locale = 'es') {
  return (key: TranslationKey): string => t[locale][key] ?? t['es'][key] ?? key
}

export const authTranslations = t
