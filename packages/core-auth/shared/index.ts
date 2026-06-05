// @core/auth/shared
export { authTranslations, useAuthT, locales } from './i18n'
export type { Locale, TranslationKey }          from './i18n'

export { AuthLayout }       from './components/AuthLayout'
export type { AuthLayoutProps, AuthAesthetic } from './components/AuthLayout'

export { LoginForm }        from './components/LoginForm'
export type { LoginFormProps } from './components/LoginForm'

export { RegisterForm }     from './components/RegisterForm'
export type { RegisterFormProps } from './components/RegisterForm'

export {
  ForgotPasswordForm,
  ResetPasswordForm,
  VerifyEmailScreen,
} from './components/AuthForms'
export type {
  ForgotPasswordFormProps,
  ResetPasswordFormProps,
  VerifyEmailScreenProps,
} from './components/AuthForms'
