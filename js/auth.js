/**
 * Authentication Module
 * Handles user signup, login, logout, and admin status checking
 */

// Current user state
let currentUser = null;
let isAdmin = false;
let currentUsername = null;

/**
 * Initialize authentication - check for existing session
 */
async function initAuth() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return;
    }

    if (session?.user) {
      currentUser = session.user;
      await checkAdminStatus();
      updateAuthUI();
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        currentUser = session.user;
        await checkAdminStatus();
        console.log('Username fetched:', currentUsername);
        updateAuthUI();
        if (event === 'SIGNED_IN') {
          toastSuccess('Successfully signed in!');
        }
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        isAdmin = false;
        currentUsername = null;
        updateAuthUI();
        toastInfo('Signed out');
      }
    });
  } catch (err) {
    console.error('Auth initialization error:', err);
  }
}

/**
 * Sign up a new user
 * @param {string} email 
 * @param {string} password 
 * @param {string} username
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signUp(email, password, username) {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase not initialized' };
  }

  // Validate username format (lowercase only)
  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return { success: false, error: 'Username must be 3-20 lowercase characters (letters, numbers, underscores only)' };
  }

  try {
    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();
    
    if (existingUser) {
      return { success: false, error: 'Username is already taken' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase()
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update the profile with username after signup
    if (data.user) {
      // Small delay to allow trigger to create profile first
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use upsert to handle timing with trigger
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: data.user.id,
          email: email,
          username: username.toLowerCase(),
          is_admin: false
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('Error setting username:', profileError);
        // Try update instead if upsert fails
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ username: username.toLowerCase() })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.error('Error updating username:', updateError);
        }
      } else {
        console.log('Username saved successfully:', username.toLowerCase());
      }
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return { 
        success: true, 
        message: 'Please check your email to confirm your account'
      };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sign in an existing user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    currentUser = data.user;
    await checkAdminStatus();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signOut() {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    currentUser = null;
    isAdmin = false;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if current user is an admin and get username
 */
async function checkAdminStatus() {
  if (!currentUser) {
    isAdmin = false;
    currentUsername = null;
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      isAdmin = false;
      currentUsername = null;
      return;
    }

    isAdmin = data?.is_admin || false;
    currentUsername = data?.username || null;
  } catch (err) {
    console.error('Admin check error:', err);
    isAdmin = false;
    currentUsername = null;
  }
}

/**
 * Get current user
 * @returns {Object|null}
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is admin
 * @returns {boolean}
 */
function getIsAdmin() {
  return isAdmin;
}

/**
 * Get current user's username
 * @returns {string|null}
 */
function getCurrentUsername() {
  return currentUsername;
}

/**
 * Check if a username is available
 * @param {string} username
 * @returns {Promise<{available: boolean, error?: string}>}
 */
async function checkUsernameAvailable(username) {
  const supabase = getSupabase();
  if (!supabase) {
    return { available: true }; // Allow in demo mode
  }

  // Validate format first
  if (!username || username.length < 3) {
    return { available: false, error: 'Too short' };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { available: false, error: 'Invalid characters' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Username check error:', error);
      return { available: true }; // Allow on error
    }

    return { available: !data };
  } catch (err) {
    console.error('Username check error:', err);
    return { available: true };
  }
}

/**
 * Check if an email is already registered
 * @param {string} email
 * @returns {Promise<{available: boolean, error?: string}>}
 */
async function checkEmailAvailable(email) {
  const supabase = getSupabase();
  if (!supabase) {
    return { available: true }; // Allow in demo mode
  }

  try {
    // Try to look up email in profiles (joined from auth.users)
    const { data, error } = await supabase
      .rpc('check_email_exists', { email_to_check: email });

    if (error) {
      // If the function doesn't exist, we can't check - allow registration
      console.warn('Email check not available:', error);
      return { available: true };
    }

    return { available: !data };
  } catch (err) {
    console.error('Email check error:', err);
    return { available: true };
  }
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  const authBtnText = document.getElementById('auth-btn-text');
  const addEntryBtn = document.getElementById('add-entry-btn');
  const addFolderBtn = document.getElementById('add-folder-btn');
  const userMenu = document.getElementById('user-menu');
  const userDisplayName = document.getElementById('user-display-name');
  const adminBadge = document.getElementById('admin-badge');
  const mobileAuthBtn = document.getElementById('mobile-auth-btn');
  const mobileAddBtn = document.getElementById('mobile-add-btn');

  if (currentUser) {
    // User is logged in
    authBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    
    // Display @username (always show username, not email)
    userDisplayName.textContent = currentUsername ? '@' + currentUsername : 'User';
    
    // Update mobile auth button to show first letter of username
    if (mobileAuthBtn) {
      const initial = currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U';
      mobileAuthBtn.innerHTML = '<span class="mobile-auth-initial">' + initial + '</span>';
      mobileAuthBtn.classList.add('logged-in');
    }
    
    // Show admin controls if admin
    if (isAdmin) {
      addEntryBtn.style.display = 'inline-flex';
      addFolderBtn.style.display = 'block';
      adminBadge.style.display = 'inline-block';
      if (mobileAddBtn) mobileAddBtn.classList.add('visible');
    } else {
      addEntryBtn.style.display = 'none';
      addFolderBtn.style.display = 'none';
      adminBadge.style.display = 'none';
      if (mobileAddBtn) mobileAddBtn.classList.remove('visible');
    }
  } else {
    // User is logged out
    authBtn.style.display = 'inline-flex';
    userMenu.style.display = 'none';
    addEntryBtn.style.display = 'none';
    addFolderBtn.style.display = 'none';
    if (mobileAddBtn) mobileAddBtn.classList.remove('visible');
    
    // Update mobile auth button to show user icon
    if (mobileAuthBtn) {
      mobileAuthBtn.innerHTML = '<span class="icon" data-icon="user"></span>';
      mobileAuthBtn.classList.remove('logged-in');
      // Re-initialize icon
      const icon = mobileAuthBtn.querySelector('.icon');
      if (icon && typeof getIcon === 'function') {
        icon.innerHTML = getIcon('user');
      }
    }
  }

  // Re-render files to show/hide action buttons
  if (typeof renderFiles === 'function') {
    renderFiles();
  }
}

/**
 * Open the authentication page
 */
function openAuthDialog() {
  // If user is logged in, go to profile page
  if (currentUser) {
    window.location.href = 'profile.html';
    return;
  }
  
  // Redirect to login page
  window.location.href = 'login.html';
}

/**
 * Setup auth event listeners
 */
function setupAuthListeners() {
  const authBtn = document.getElementById('auth-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const mobileAuthBtn = document.getElementById('mobile-auth-btn');
  const userInfo = document.querySelector('.user-info');

  // Open auth page (redirect)
  authBtn?.addEventListener('click', openAuthDialog);
  
  // Mobile auth button - login or profile page
  mobileAuthBtn?.addEventListener('click', openAuthDialog);
  
  // Click on username area to go to profile
  userInfo?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentUser) {
      window.location.href = 'profile.html';
    }
  });

  // Sign out
  signOutBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await signOut();
    if (!result.success) {
      toastError(result.error || 'Failed to sign out');
    }
  });
}
