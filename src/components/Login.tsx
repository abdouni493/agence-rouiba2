import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, UserPlus, User as UserIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { Language, UserRole, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { DatabaseService } from '../services/DatabaseService';
import { sessionService } from '../utils/sessionService';

interface LoginProps {
  lang: Language;
  // now emit full user object once authenticated
  onLogin: (user: User) => void;
}

interface AgencyBranding {
  logo: string;
  name: string;
}

export const Login: React.FC<LoginProps> = ({ lang, onLogin }) => {
  const t = TRANSLATIONS[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agencyBranding, setAgencyBranding] = useState<AgencyBranding>({
    logo: '',
    name: 'AutoLocation'
  });

  // First-run admin setup. `null` = not yet known, so the button stays hidden
  // until we have a definite answer from the database.
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createError, setCreateError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reads the public.admin_count view (count of profiles with role = 'admin').
  // Returns null when the answer can't be determined.
  const fetchAdminExists = async (): Promise<boolean | null> => {
    try {
      const { data, error } = await supabase
        .from('admin_count')
        .select('count')
        .maybeSingle();

      if (error) {
        console.warn('[Login] Unable to read admin_count:', error.message);
        return null;
      }

      return (data?.count ?? 0) > 0;
    } catch (err) {
      console.warn('[Login] Unable to read admin_count:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadAgencyBranding = async () => {
      try {
        const settings = await DatabaseService.getWebsiteSettings();
        if (settings) {
          setAgencyBranding({
            logo: settings.logo || '',
            name: settings.name || 'AutoLocation'
          });
        }
      } catch (err) {
        console.warn('Error loading agency branding:', err);
      }
    };

    loadAgencyBranding();
    fetchAdminExists().then(setAdminExists);
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreatingAdmin) return;

    setCreateError('');
    setSuccessMessage('');

    const name = adminName.trim();
    const mail = adminEmail.trim();

    if (!name || !mail || !adminPassword) {
      setCreateError(lang === 'fr'
        ? 'Veuillez remplir tous les champs.'
        : 'يرجى ملء جميع الحقول.');
      return;
    }

    if (!mail.includes('@')) {
      setCreateError(lang === 'fr'
        ? 'Adresse email invalide.'
        : 'البريد الإلكتروني غير صالح.');
      return;
    }

    if (adminPassword.length < 6) {
      setCreateError(lang === 'fr'
        ? 'Le mot de passe doit contenir au moins 6 caractères.'
        : 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.');
      return;
    }

    if (adminPassword !== adminConfirm) {
      setCreateError(lang === 'fr'
        ? 'Les mots de passe ne correspondent pas.'
        : 'كلمتا المرور غير متطابقتين.');
      return;
    }

    setIsCreatingAdmin(true);

    // Re-check right before signing up, in case an admin appeared meanwhile.
    const alreadyExists = await fetchAdminExists();
    if (alreadyExists) {
      setAdminExists(true);
      setShowCreateAdmin(false);
      setIsCreatingAdmin(false);
      setCreateError(lang === 'fr'
        ? 'Un compte administrateur existe déjà.'
        : 'يوجد حساب مدير بالفعل.');
      return;
    }

    console.log('[Login] === CREATING ADMIN ACCOUNT ===');

    // Creates the user in Supabase Auth (auth.users). The on_auth_user_created
    // trigger then inserts the matching public.profiles row with role = 'admin'.
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password: adminPassword,
      options: {
        data: { role: 'admin', username: name, full_name: name }
      }
    });

    if (error) {
      console.log('[Login] Admin creation failed:', error.message);
      setCreateError(error.message);
      setIsCreatingAdmin(false);
      return;
    }

    console.log('[Login] Auth user created:', data.user?.id);

    // The app manages sessions itself, so drop the session signUp may have opened
    // and make the new admin sign in through the normal form.
    try {
      await supabase.auth.signOut();
    } catch {
      /* no session to clear */
    }

    const nowExists = await fetchAdminExists();
    setAdminExists(nowExists ?? true);
    setShowCreateAdmin(false);
    setIsCreatingAdmin(false);

    // Prefill the login form with the account we just created.
    setEmail(mail);
    setPassword('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminConfirm('');
    setErrorMessage('');
    setSuccessMessage(lang === 'fr'
      ? 'Compte administrateur créé. Connectez-vous avec vos identifiants.'
      : 'تم إنشاء حساب المدير. سجّل الدخول ببياناتك.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[Login] ======= LOGIN ATTEMPT STARTED at ${timestamp} =======`);

    // Prevent double submissions
    if (isSubmitting) {
      console.log('[Login] Form already submitting, ignoring duplicate submission');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      // LOGIN FLOW - Determine auth method based on input format
      const credential = email.trim();
      const isEmailInput = credential.includes('@');

      if (!credential || !password) {
        console.log('[Login] Missing credentials - email:', !!credential, 'password:', !!password);
        setErrorMessage(lang === 'fr'
          ? 'Veuillez entrer vos identifiants.'
          : 'الرجاء إدخال بيانات الدخول.');
        setIsSubmitting(false);
        return;
      }

      // LOGIN FLOW - All users (admin and workers) use Supabase Auth with email
      // Users must provide email and password to login
      console.log('[Login] === AUTHENTICATION ATTEMPT ===');
      console.log('[Login] Credentials provided - email format:', isEmailInput);

      try {
        // For email input: try Supabase Auth first, then fall back to worker RPC
        if (isEmailInput) {
          console.log('[Login] Email authentication for:', credential);

          // Try Supabase Auth first (for admin accounts)
          const result = await supabase.auth.signInWithPassword({
            email: credential,
            password
          });

          if (result.error) {
            console.log('[Login] Supabase Auth failed:', result.error.message);
            // If Supabase Auth fails, try worker RPC login
            console.log('[Login] Trying worker login via RPC...');

            const { data: loginResult, error: rpcError } = await supabase.rpc('login_worker', {
              p_email_or_username: credential,
              p_password: password
            });

            if (rpcError || !loginResult?.success) {
              console.log('[Login] Worker login also failed:', rpcError?.message || loginResult?.error);
              setErrorMessage(lang === 'fr'
                ? 'Email ou mot de passe incorrect.'
                : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
              setIsSubmitting(false);
              return;
            }

            // Worker RPC login successful
            const worker = loginResult.worker;
            const workerRole = (worker.type as UserRole) || 'worker';

            console.log('[Login] === WORKER LOGIN SUCCESSFUL ===');
            console.log('[Login] Worker authenticated:', { name: worker.full_name, email: worker.email, role: workerRole });

            // Save worker session to database
            const sessionResult = await sessionService.createSession(
              `worker_token_${Date.now()}`,
              undefined,
              Math.floor(Date.now() / 1000) + (24 * 60 * 60),
              worker.id || `worker_${Date.now()}`,
              worker.email || '',
              workerRole,
              worker.full_name
            );

            console.log('[Login] Session saved:', !!sessionResult);

            // Clear form
            setEmail('');
            setPassword('');

            console.log('[Login] Calling onLogin callback...');
            onLogin({
              name: worker.full_name,
              email: worker.email || '',
              role: workerRole,
              avatar: worker.profile_photo || ''
            });
            return;
          }

          if (result.data?.session) {
            const u = result.data.user;
            const role = (u.user_metadata?.role as UserRole) || 'admin';
            const name = (u.user_metadata?.username as string) || u.user_metadata?.full_name || u.email || '';

            console.log('[Login] === ADMIN LOGIN SUCCESSFUL ===');
            console.log('[Login] Admin authenticated:', { name, email: u.email, role });

            // Save session to database using new session service
            console.log('[Login] Saving session to database...');
            await sessionService.createSession(
              result.data.session.access_token,
              result.data.session.refresh_token,
              result.data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
              u.id,
              u.email || '',
              role,
              name
            );

            // CRITICAL: Clear all SDK session data to prevent auto-refresh
            console.log('[Login] Clearing SDK session data to prevent auto-refresh...');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.clear();

            // Clear form
            setEmail('');
            setPassword('');

            console.log('[Login] Calling onLogin callback...');
            onLogin({ name, email: u.email || '', role, avatar: '' });
            return;
          }
        } else {
          // For non-email input (username): show error message
          console.log('[Login] Username-based login no longer supported. Please use email.');
          setErrorMessage(lang === 'fr'
            ? 'Veuillez utiliser votre email pour vous connecter.'
            : 'يرجى استخدام بريدك الإلكتروني للدخول.');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.log('[Login] Authentication exception:', error);
        setErrorMessage(lang === 'fr'
          ? 'Une erreur est survenue lors de la connexion.'
          : 'حدث خطأ أثناء تسجيل الدخول.');
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.log('[Login] === UNEXPECTED ERROR ===');
      console.log('[Login] Error:', error);
      setErrorMessage(lang === 'fr'
        ? 'Une erreur est survenue lors de la connexion.'
        : 'حدث خطأ أثناء تسجيل الدخول.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-saas-bg via-saas-bg to-blue-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-saas-primary-start rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-saas-primary-via rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 w-96 h-96 bg-saas-primary-end rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Main login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-10 space-y-10 border border-saas-border shadow-xl">

          {/* Agency Logo & Name Section */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* Logo */}
            {agencyBranding.logo && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring", stiffness: 100 }}
                className="flex justify-center mb-2"
              >
                <img
                  src={agencyBranding.logo}
                  alt="Logo"
                  className="h-20 w-20 object-contain drop-shadow-lg rounded-xl border border-saas-border"
                />
              </motion.div>
            )}

            {/* Agency Name - First 3 words only */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end bg-clip-text text-transparent uppercase">
                {agencyBranding.name.split(' ').slice(0, 3).join(' ')}
              </h1>
              <motion.p
                className="text-saas-text-muted font-bold uppercase tracking-[0.3em] text-[11px] mt-3"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {t.login}
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Form Section */}
          <motion.form
            className="space-y-8"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="space-y-6">
              {/* Email field */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <label className="label-saas">{t.email}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-saas pl-12"
                    placeholder="john@email.com"
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <label className="label-saas">{t.password}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-saas pl-12 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-saas-text-muted hover:text-saas-primary-via transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"
              >
                {errorMessage}
              </motion.div>
            )}

            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm"
              >
                {successMessage}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(30, 58, 138, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              className="btn-saas-primary w-full text-sm py-4"
            >
              {isSubmitting ? (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {t.login}...
                </motion.span>
              ) : (
                t.login
              )}
            </motion.button>
          </motion.form>

          {/* First-run setup: shown only while public.admin_count reports 0 admins.
              Once the account exists the whole block disappears for good. */}
          {adminExists === false && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-saas-border" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-saas-text-muted whitespace-nowrap">
                  {lang === 'fr' ? 'Première configuration' : 'الإعداد الأولي'}
                </span>
                <div className="h-px flex-1 bg-saas-border" />
              </div>

              {!showCreateAdmin ? (
                <div className="space-y-4">
                  <p className="text-center text-xs text-saas-text-muted leading-relaxed">
                    {lang === 'fr'
                      ? "Aucun compte administrateur n'existe encore pour cette agence."
                      : 'لا يوجد حساب مدير لهذه الوكالة بعد.'}
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowCreateAdmin(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                      setCreateError('');
                    }}
                    className="btn-saas-secondary w-full text-sm py-4 flex items-center justify-center gap-2"
                  >
                    <UserPlus size={18} />
                    {lang === 'fr' ? 'Créer le compte administrateur' : 'إنشاء حساب المدير'}
                  </motion.button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleCreateAdmin}>
                  {/* Full name */}
                  <div className="space-y-2">
                    <label className="label-saas">
                      {lang === 'fr' ? 'Nom complet' : 'الاسم الكامل'}
                    </label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="input-saas pl-12"
                        placeholder={lang === 'fr' ? 'Administrateur' : 'المدير'}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="label-saas">{t.email}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="input-saas pl-12"
                        placeholder="admin@email.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="label-saas">{t.password}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="input-saas pl-12"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <label className="label-saas">
                      {lang === 'fr' ? 'Confirmer le mot de passe' : 'تأكيد كلمة المرور'}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-saas-text-muted group-focus-within:text-saas-primary-via transition-colors" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminConfirm}
                        onChange={(e) => setAdminConfirm(e.target.value)}
                        className="input-saas pl-12"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {createError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"
                    >
                      {createError}
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      disabled={isCreatingAdmin}
                      whileHover={{ scale: isCreatingAdmin ? 1 : 1.02 }}
                      whileTap={{ scale: isCreatingAdmin ? 1 : 0.98 }}
                      onClick={() => {
                        setShowCreateAdmin(false);
                        setCreateError('');
                      }}
                      className="btn-saas-outline flex-1 text-sm py-4"
                    >
                      {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isCreatingAdmin}
                      whileHover={{ scale: isCreatingAdmin ? 1 : 1.02 }}
                      whileTap={{ scale: isCreatingAdmin ? 1 : 0.98 }}
                      className="btn-saas-primary flex-1 text-sm py-4"
                    >
                      {isCreatingAdmin ? (
                        <motion.span
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {lang === 'fr' ? 'Création...' : 'جارٍ الإنشاء...'}
                        </motion.span>
                      ) : (
                        lang === 'fr' ? 'Créer' : 'إنشاء'
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* Decorative line */}
          <motion.div
            className="h-0.5 bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end rounded-full"
            animate={{ scaleX: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
};
