/**
 * Main Application Logic
 * Coordinates all modules and handles state management
 */

// ============================================
// APPLICATION STATE
// ============================================

let appState = {
  files: [],
  folders: [],
  filteredFiles: [],
  
  // Filters
  typeFilter: 'all',
  folderFilter: null,
  selectedTags: [],
  searchQuery: '',
  
  // UI state
  isLoading: true,
  editingFile: null
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing Academic Archive...');
  
  // Apply dark mode from localStorage
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  // Initialize icons first
  initializeIcons();
  
  // Setup all event listeners
  setupEventListeners();
  setupAuthListeners();
  
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Using localStorage fallback.');
    toastInfo('Running in demo mode (localStorage)');
  }
  
  // Load initial data
  await loadData();
  
  // Initialize auth after Supabase is ready
  if (isSupabaseConfigured()) {
    await initAuth();
  }
  
  appState.isLoading = false;
  
  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // Remove from DOM after animation
    setTimeout(() => loadingScreen.remove(), 300);
  }
  
  console.log('Academic Archive initialized');
}

/**
 * Load all data from database/localStorage
 */
async function loadData() {
  try {
    // Load files and folders in parallel
    const [files, folders] = await Promise.all([
      getFiles(),
      getFolders()
    ]);
    
    appState.files = files;
    appState.folders = recalculateFolderCounts(files, folders);
    
    // Apply filters and render
    applyFilters();
    renderSidebar();
    
  } catch (err) {
    console.error('Error loading data:', err);
    toastError('Failed to load data');
  }
}

// ============================================
// FILTERING & SEARCH
// ============================================

/**
 * Apply all filters to files
 */
function applyFilters() {
  let filtered = [...appState.files];
  
  // Type filter
  if (appState.typeFilter !== 'all') {
    filtered = filtered.filter(f => f.type === appState.typeFilter);
  }
  
  // Folder filter
  if (appState.folderFilter) {
    filtered = filtered.filter(f => f.folderId === appState.folderFilter);
  }
  
  // Tag filter
  if (appState.selectedTags.length > 0) {
    filtered = filtered.filter(f => {
      const fileTags = f.tags || [];
      return appState.selectedTags.some(tag => fileTags.includes(tag));
    });
  }
  
  // Search filter
  if (appState.searchQuery) {
    const query = appState.searchQuery.toLowerCase();
    filtered = filtered.filter(f => {
      const titleMatch = (f.title || '').toLowerCase().includes(query);
      const descMatch = (f.description || '').toLowerCase().includes(query);
      const tagMatch = (f.tags || []).some(t => t.toLowerCase().includes(query));
      return titleMatch || descMatch || tagMatch;
    });
  }
  
  appState.filteredFiles = filtered;
  renderFiles();
}

/**
 * Set type filter
 * @param {string} type 
 */
function setTypeFilter(type) {
  appState.typeFilter = type;
  applyFilters();
  updateTypeFilterUI();
}

/**
 * Set folder filter
 * @param {string|null} folderId 
 */
function setFolderFilter(folderId) {
  appState.folderFilter = folderId;
  applyFilters();
  updateFolderFilterUI();
}

/**
 * Toggle tag filter
 * @param {string} tag 
 */
function toggleTagFilter(tag) {
  const index = appState.selectedTags.indexOf(tag);
  if (index === -1) {
    appState.selectedTags.push(tag);
  } else {
    appState.selectedTags.splice(index, 1);
  }
  applyFilters();
  updateTagFilterUI();
}

/**
 * Set search query
 * @param {string} query 
 */
function setSearchQuery(query) {
  appState.searchQuery = query;
  applyFilters();
}

// ============================================
// RENDERING
// ============================================

/**
 * Render files grid
 */
function renderFiles() {
  renderFilesGrid(appState.filteredFiles, getIsAdmin());
  updateEntriesCount(appState.filteredFiles.length);
}

/**
 * Render sidebar content
 */
function renderSidebar() {
  renderFolderFilters(appState.folders, appState.folderFilter);
  
  const allTags = extractAllTags(appState.files);
  renderTagFilters(allTags, appState.selectedTags);
  
  // Re-attach folder filter listeners
  document.querySelectorAll('#folder-filters .sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const folderId = btn.dataset.folderId;
      setFolderFilter(appState.folderFilter === folderId ? null : folderId);
      // Auto-close sidebar on mobile
      if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
      }
    });
  });
  
  // Re-attach tag filter listeners
  document.querySelectorAll('#tag-filters .sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleTagFilter(btn.dataset.tag);
      // Auto-close sidebar on mobile
      if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
      }
    });
  });
}

/**
 * Update type filter UI (active state)
 */
function updateTypeFilterUI() {
  document.querySelectorAll('#file-type-filters .sidebar-btn').forEach(btn => {
    const filter = btn.dataset.filter;
    btn.classList.toggle('active', filter === appState.typeFilter);
  });
}

/**
 * Update folder filter UI
 */
function updateFolderFilterUI() {
  document.querySelectorAll('#folder-filters .sidebar-btn').forEach(btn => {
    const folderId = btn.dataset.folderId;
    btn.classList.toggle('active', folderId === appState.folderFilter);
  });
}

/**
 * Update tag filter UI
 */
function updateTagFilterUI() {
  document.querySelectorAll('#tag-filters .sidebar-btn').forEach(btn => {
    const tag = btn.dataset.tag;
    btn.classList.toggle('active', appState.selectedTags.includes(tag));
  });
}

// ============================================
// FILE CRUD HANDLERS
// ============================================

/**
 * Handle add entry button click
 */
function handleAddEntry() {
  appState.editingFile = null;
  openFileDialog(null, appState.folders);
}

/**
 * Handle edit file
 * @param {string} fileId 
 */
function handleEditFile(fileId) {
  const file = appState.files.find(f => f.id === fileId);
  if (!file) return;
  
  appState.editingFile = file;
  openFileDialog(file, appState.folders);
}

/**
 * Handle delete file
 * @param {string} fileId 
 */
async function handleDeleteFile(fileId) {
  const file = appState.files.find(f => f.id === fileId);
  if (!file) return;
  
  if (!confirm(`Delete "${file.title}"? This action cannot be undone.`)) {
    return;
  }
  
  const result = await deleteFile(fileId);
  
  if (result.success) {
    appState.files = appState.files.filter(f => f.id !== fileId);
    appState.folders = recalculateFolderCounts(appState.files, appState.folders);
    applyFilters();
    renderSidebar();
    toastSuccess('Entry deleted successfully');
  } else {
    toastError(result.error || 'Failed to delete entry');
  }
}

/**
 * Handle file form submission
 * @param {Event} e 
 */
async function handleFileFormSubmit(e) {
  e.preventDefault();
  
  const fileId = document.getElementById('file-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const type = document.getElementById('entry-type').value;
  const folderId = document.getElementById('entry-folder').value || null;
  const description = document.getElementById('entry-description').value.trim();
  const tags = getCurrentTags();
  
  if (!title) {
    toastError('Title is required');
    return;
  }
  
  // Prepare file data
  let fileUrl = appState.editingFile?.fileUrl;
  let thumbnailUrl = appState.editingFile?.thumbnailUrl;
  let fileName = appState.editingFile?.fileName;
  let fileSize = appState.editingFile?.fileSize;
  
  // Handle file upload if a new file is selected
  if (selectedFile) {
    const uploadResult = await uploadFile(selectedFile);
    if (uploadResult.success) {
      fileUrl = uploadResult.url;
      fileName = selectedFile.name;
      fileSize = formatFileSize(selectedFile.size);
      
      // Use same URL for thumbnail if image
      if (type === 'image') {
        thumbnailUrl = uploadResult.url;
      }
    } else {
      toastError(uploadResult.error || 'Failed to upload file');
      return;
    }
  }
  
  // Get folder name
  const folder = appState.folders.find(f => f.id === folderId);
  const folderName = folder?.name || null;
  
  const fileData = {
    title,
    type,
    folderId,
    folderName,
    description,
    tags,
    fileUrl,
    thumbnailUrl,
    fileName,
    fileSize
  };
  
  let result;
  
  if (fileId) {
    // Update existing file
    result = await updateFile(fileId, fileData);
    if (result.success) {
      const index = appState.files.findIndex(f => f.id === fileId);
      if (index !== -1) {
        appState.files[index] = {
          ...appState.files[index],
          ...fileData,
          updatedAt: new Date()
        };
      }
      toastSuccess('Entry updated successfully');
    }
  } else {
    // Create new file
    result = await createFile(fileData);
    if (result.success) {
      const newFile = {
        id: result.data?.id || crypto.randomUUID(),
        ...fileData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      appState.files.unshift(newFile);
      toastSuccess('Entry added successfully');
    }
  }
  
  if (result.success) {
    appState.folders = recalculateFolderCounts(appState.files, appState.folders);
    applyFilters();
    renderSidebar();
    closeFileDialog();
  } else {
    toastError(result.error || 'Failed to save entry');
  }
}

/**
 * Handle folder form submission
 * @param {Event} e 
 */
async function handleFolderFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('folder-name').value.trim();
  
  if (!name) {
    toastError('Collection name is required');
    return;
  }
  
  const result = await createFolder(name);
  
  if (result.success) {
    appState.folders.push(result.data);
    renderSidebar();
    closeFolderDialog();
    toastSuccess('Collection created successfully');
  } else {
    toastError(result.error || 'Failed to create collection');
  }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Type filter buttons
  document.querySelectorAll('#file-type-filters .sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTypeFilter(btn.dataset.filter);
      // Auto-close sidebar on mobile
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
  
  // Add entry button
  document.getElementById('add-entry-btn')?.addEventListener('click', handleAddEntry);
  
  // Mobile floating add button
  document.getElementById('mobile-add-btn')?.addEventListener('click', handleAddEntry);
  
  // Add folder button
  document.getElementById('add-folder-btn')?.addEventListener('click', openFolderDialog);
  
  // Search input (desktop)
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearchQuery(e.target.value);
      // Sync mobile search
      const mobileSearch = document.getElementById('mobile-search-input');
      if (mobileSearch && mobileSearch.value !== e.target.value) {
        mobileSearch.value = e.target.value;
      }
    }, 300);
  });
  
  // Mobile search input
  const mobileSearchInput = document.getElementById('mobile-search-input');
  mobileSearchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearchQuery(e.target.value);
      // Sync desktop search
      if (searchInput && searchInput.value !== e.target.value) {
        searchInput.value = e.target.value;
      }
    }, 300);
  });
  
  // Mobile hamburger menu
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const burgerBtn = document.getElementById('burger-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  
  function openSidebar() {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Push a state to handle back button
    history.pushState({ sidebarOpen: true }, '');
  }
  
  function closeSidebar() {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Handle browser back button when sidebar is open
  window.addEventListener('popstate', (event) => {
    if (sidebar?.classList.contains('open')) {
      closeSidebar();
    }
  });
  
  // Make closeSidebar available globally for other click handlers
  window.closeSidebar = closeSidebar;
  
  burgerBtn?.addEventListener('click', openSidebar);
  sidebarCloseBtn?.addEventListener('click', () => {
    closeSidebar();
    // Go back in history to remove the state we pushed
    if (history.state?.sidebarOpen) {
      history.back();
    }
  });
  sidebarOverlay?.addEventListener('click', () => {
    closeSidebar();
    // Go back in history to remove the state we pushed
    if (history.state?.sidebarOpen) {
      history.back();
    }
  });
  
  // Mobile auth button - opens auth dialog
  document.getElementById('mobile-auth-btn')?.addEventListener('click', () => {
    openAuthDialog();
  });
  
  // File dialog
  document.getElementById('file-dialog-close')?.addEventListener('click', closeFileDialog);
  document.getElementById('file-dialog-cancel')?.addEventListener('click', closeFileDialog);
  document.getElementById('file-form')?.addEventListener('submit', handleFileFormSubmit);
  
  // Close dialog on backdrop click
  document.getElementById('file-dialog')?.addEventListener('click', (e) => {
    if (e.target.id === 'file-dialog') closeFileDialog();
  });
  
  // File upload
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  });
  
  document.getElementById('remove-file-btn')?.addEventListener('click', resetFileUpload);
  
  // Tag input
  const tagInput = document.getElementById('tag-input');
  document.getElementById('add-tag-btn')?.addEventListener('click', () => {
    addTagToList(tagInput.value);
    tagInput.value = '';
  });
  
  tagInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagToList(tagInput.value);
      tagInput.value = '';
    }
  });
  
  // Folder dialog
  document.getElementById('folder-dialog-close')?.addEventListener('click', closeFolderDialog);
  document.getElementById('folder-dialog-cancel')?.addEventListener('click', closeFolderDialog);
  document.getElementById('folder-form')?.addEventListener('submit', handleFolderFormSubmit);
  
  // Close folder dialog on backdrop click
  document.getElementById('folder-dialog')?.addEventListener('click', (e) => {
    if (e.target.id === 'folder-dialog') closeFolderDialog();
  });
}

// ============================================
// APP STARTUP
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase to load if configured
    if (isSupabaseConfigured()) {
      window.addEventListener('supabaseReady', initApp, { once: true });
      
      // Reduced timeout for faster mobile experience
      setTimeout(() => {
        if (appState.isLoading) {
          console.warn('Supabase load timeout, initializing anyway');
          initApp();
        }
      }, 3000);
    } else {
      initApp();
    }
  });
} else {
  // DOM already loaded
  if (isSupabaseConfigured()) {
    if (getSupabase()) {
      initApp();
    } else {
      window.addEventListener('supabaseReady', initApp, { once: true });
      setTimeout(() => {
        if (appState.isLoading) initApp();
      }, 3000);
    }
  } else {
    initApp();
  }
}
